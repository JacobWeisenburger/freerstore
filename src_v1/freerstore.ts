import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import { makeLastSync } from './makeLastSync'
import { firestore } from './firestore/index'
import { debounce } from './debounce'
import { ModifiedAtPropType } from './types'
import { LocalDB } from './LocalDB'
import { cluster } from 'radash'
import { prune } from './utils'

export module freerstore {

    /* NEEDED FOR EXPORTING */
    /*
        for some reason exported types don't get exported
        unless there is a private type in the module
    */
    type internalUseOnly = 'internalUseOnly'
    export type InternalUseOnly = internalUseOnly
    /* NEEDED FOR EXPORTING */


    export type Result<DocData extends Record<string, unknown>> =
        z.SafeParseReturnType<DocData, DocData>

    export type ResultsMap<DocData extends Record<string, unknown>> = Map<string, Result<DocData>>

    export type Collection = ReturnType<typeof getCollection>
    export function getCollection<DocSchema extends z.AnyZodObject> ( {
        firebaseApp,
        name,
        documentSchema,
        freerstoreSectionKey = 'freerstore',
        modifiedAtKey = 'modifiedAt',
        modifiedAtType = 'isoString',
        serverWriteDelayMs = 1000,
    }: {
        firebaseApp: FirebaseApp,
        name: string,
        documentSchema: DocSchema,
        freerstoreSectionKey?: string,
        modifiedAtKey?: string,
        modifiedAtType?: ModifiedAtPropType,
        serverWriteDelayMs?: number,
    } ) {
        serverWriteDelayMs = Math.max( serverWriteDelayMs, 0 )

        type DocData = z.infer<DocSchema>
        type DocResultsMap = ResultsMap<DocData>

        const firestoreDB = firestore.getFirestore( firebaseApp )
        if ( !firebaseApp.options.projectId ) throw new Error( 'Firebase project ID is required' )

        const collectionRef = firestore.collection(
            firestoreDB, name
        ) as firestore.CollectionReference<DocData>

        const modifiedAtPropPath = [ freerstoreSectionKey, modifiedAtKey ].join( '.' )

        const lastSync = makeLastSync( {
            dbName: firebaseApp.options.projectId,
            storeName: name,
            modifiedAtType,
        } )

        type Data = z.infer<typeof freerstoreDocSchema>
        const freerstoreDocSchema = z.union( [
            documentSchema.extend( {
                [ freerstoreSectionKey ]: z.object( {
                    pendingWriteToServer: z.literal( true ).optional(),
                    [ modifiedAtKey ]: {
                        isoString: firestore.isoStringSchema,
                        date: firestore.dateSchema,
                    }[ modifiedAtType ]
                } ),
            } ),
            documentSchema.transform( docData => {
                docData[ freerstoreSectionKey ] = docData[ freerstoreSectionKey ] ?? {}
                docData[ freerstoreSectionKey ][ modifiedAtKey ] = {
                    isoString: new Date().toISOString(),
                    date: new Date(),
                }[ modifiedAtType ]
                return docData
            } ),
        ] )

        const asyncStore = LocalDB
            .db( firebaseApp.options.projectId )
            .asyncStore( name, freerstoreDocSchema )


        function serverWrite ( id: string, result: ParseResult ) {
            pendingWriteItems.set( id, result )
            commitPendingWriteItems()
        }

        const pendingWriteItems = new Map<string, ParseResult>()
        const commitPendingWriteItems = debounce(
            serverWriteDelayMs,
            async () => {
                emit( 'serverWriteStart' )

                const processedPendingWriteItems = Array.from( pendingWriteItems )
                    .reduce( ( map, [ id, result ] ) => {
                        pendingWriteItems.delete( id )
                        if (
                            result.success &&
                            result.data[ freerstoreSectionKey ].pendingWriteToServer
                        ) {
                            delete result.data[ freerstoreSectionKey ].pendingWriteToServer
                            map.set( id, result.data )
                        }
                        return map
                    }, new Map<string, Data>() )

                const groups = cluster( Array.from( processedPendingWriteItems ), 500 )

                await Promise.all(
                    groups.map( async group => {
                        const batch = firestore.writeBatch( firestoreDB )


                        /* TODO error emitting */

                        group.forEach( ( [ id, data ] ) => {
                            const prunedData = prune( data )
                            try {
                                // batch.set( firestore.doc( collectionRef, id ), data )
                                batch.set( firestore.doc( collectionRef, id ), prunedData )
                            } catch ( error ) {
                                emit( 'batchSetError', {
                                    error,
                                    data,
                                    prunedData
                                } )
                            }
                        } )

                        /* TODO error emitting */


                        await batch.commit()
                    } )
                )

                emit( 'serverWriteEnd' )
            }
        )

        // TODO: medium priority:
        // deal with committing pending writes after a long time being offline
        // commitPendingWriteItems()

        type ParseResult = {
            success: true
            data: DocData
        } | {
            success: false
            error: z.ZodError
        }

        type ResultEntry = [ string, ParseResult ]

        function cacheWrite ( id: string, docData: DocData ): ResultEntry {
            const docResult = documentSchema.safeParse( docData )
            if ( !docResult.success ) return [ id, docResult ]

            const freerstoreDocResult = freerstoreDocSchema.safeParse( docResult.data )
            emit( 'cacheWriteStart', [ id, freerstoreDocResult ] )

            if ( freerstoreDocResult.success ) {
                const keys = new Set( Object.keys( freerstoreDocResult.data ) )
                keys.delete( freerstoreSectionKey )
                if ( keys.size > 0 ) {
                    freerstoreDocResult.data[ freerstoreSectionKey ].pendingWriteToServer = true
                    asyncStore.set(
                        firestore.doc( collectionRef, id ).id,
                        freerstoreDocResult.data
                    ).then( () => emit( 'cacheWriteEnd', [ id, freerstoreDocResult ] ) )
                } else {
                    const dataString = JSON.stringify( docResult.data )
                    const message = `data is empty: ${ id }: ${ dataString }`
                    emit( 'cacheWriteEnd', [ id, freerstoreDocResult ] )
                    return [ id, {
                        success: false,
                        error: new z.ZodError( [ {
                            code: 'custom',
                            path: [],
                            message
                        } ] )
                    } ]
                }
            }

            return [ id, freerstoreDocResult ]
        }

        type Events = {
            cacheWriteStart: ( resultEntry?: ResultEntry ) => void
            cacheWriteEnd: ( resultEntry?: ResultEntry ) => void
            serverWriteStart: ( resultEntry?: ResultEntry ) => void
            serverWriteEnd: ( resultEntry?: ResultEntry ) => void
            batchSetError: ( ctx?: {
                error: unknown
                data: unknown
                prunedData: unknown
            } ) => void
        }
        type EventKey = keyof Events
        type EventHandler<Key extends EventKey> = Events[ Key ]
        type Arg<Key extends EventKey> = Parameters<EventHandler<Key>>[ 0 ]

        const eventHandlers = new Map<EventKey, Set<EventHandler<EventKey>>>()
        function on<Key extends EventKey> ( key: Key, handler: EventHandler<Key> ) {
            const handlers = eventHandlers.get( key ) ?? new Set()
            handlers.add( handler )
            eventHandlers.set( key, handlers )
            return () => { eventHandlers.get( key )?.delete( handler ) }
        }

        function emit<Key extends EventKey> ( key: Key, arg?: Arg<Key> ) {
            eventHandlers.get( key )?.forEach( handler => handler( arg as any ) )
        }

        return {
            _types: {
                DocData: {} as DocData,
            },
            props: {
                name,
                documentSchema,
                freerstoreSectionKey,
                modifiedAtKey,
                modifiedAtType,
                serverWriteDelayMs,
            },
            on,
            async getDocFromServer ( id: string ): Promise<ResultEntry> {
                const docSnap = await firestore.getDoc( firestore.doc( collectionRef, id ) )
                const result = freerstoreDocSchema.safeParse( docSnap.data() )
                return [ id, result ]
            },
            async getDocFromCache ( id: string ): Promise<ResultEntry> {
                return [ id, await asyncStore.get( id ) ]
            },
            async getAllFromCache (): Promise<DocResultsMap> {
                return asyncStore.getAll()
            },
            setDoc ( id: string, docData: DocData ): ResultEntry {
                const [ , result ] = cacheWrite( id, docData )
                serverWrite( id, result )
                return [ id, result ]
            },
            setDocs ( docs: Record<string, DocData> = {} ) {
                return new Map(
                    Object.entries( docs )
                        .map( ( [ id, docData ] ) => this.setDoc( id, docData ) )
                )
            },

            onSnapshot (
                handler: ( map: ResultsMap<DocData> ) => void = () => { }
            ): firestore.Unsubscribe {
                /* 
                Restart onSnapshot with new lastSync.get() after each batch.
                This prevents docs that were changed after lastSync from
                being included in every batch until the next restart.
                */

                let unsubscribe: firestore.Unsubscribe = () => { }

                const handlerWrapper = ( snap: firestore.QuerySnapshot<DocData> ) => {
                    lastSync.set()
                    if ( snap.empty ) return

                    const resultsMap = new Map(
                        snap.docs.map( docSnap => {
                            const result = freerstoreDocSchema.safeParse( docSnap.data() )
                            if ( result.success ) asyncStore.set( docSnap.id, result.data )
                            return [ docSnap.id, result ]
                        } )
                    )
                    handler( resultsMap )
                    initOnSnapshot()
                }

                const initQuery = () => {
                    return firestore.query(
                        collectionRef,
                        firestore.where( modifiedAtPropPath, '>', lastSync.get() )
                    )
                }

                const initOnSnapshot = () => {
                    unsubscribe()
                    unsubscribe = firestore.onSnapshot(
                        initQuery(),
                        handlerWrapper,
                        console.error
                    )
                }

                initOnSnapshot()

                return () => {
                    unsubscribe()
                }
            }
        }
    }
}