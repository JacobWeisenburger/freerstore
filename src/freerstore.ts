import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import { makeLastSync } from './makeLastSync'
import { firestore } from './firestore/index'
import { debounce } from './debounce'
import { ModifiedAtPropType } from './types'
import { LocalDB } from './LocalDB'
import { logDeep } from './utils'

export type Result<DocData extends Record<string, unknown>> =
    z.SafeParseReturnType<DocData, DocData>

export type ResultsMap<DocData extends Record<string, unknown>> = Map<string, Result<DocData>>

export async function getCollection<DocSchema extends z.AnyZodObject> ( {
    firebaseApp,
    collectionName,
    documentSchema,
    freerstoreSectionKey = 'freerstore',
    modifiedAtKey = 'modifiedAt',
    modifiedAtType = 'isoString',
    serverWriteDelayMs = 2000,
}: {
    firebaseApp: FirebaseApp,
    collectionName: string,
    documentSchema: DocSchema,
    freerstoreSectionKey?: string,
    modifiedAtKey?: string,
    modifiedAtType?: ModifiedAtPropType,
    serverWriteDelayMs?: number,
} ) {
    type DocData = z.infer<DocSchema>

    const firestoreDB = firestore.getFirestore( firebaseApp )
    if ( !firebaseApp.options.projectId ) throw new Error( 'Firebase project ID is required' )

    const collectionRef = firestore.collection(
        firestoreDB, collectionName
    ) as firestore.CollectionReference<DocData>

    const modifiedAtPropPath = [ freerstoreSectionKey, modifiedAtKey ].join( '.' )

    const lastSync = makeLastSync( {
        dbName: firebaseApp.options.projectId,
        storeName: collectionName,
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
        // .syncStore( collectionName, freerstoreDocSchema )
        .asyncStore( collectionName, freerstoreDocSchema )

    const commitPendingWriteItems = debounce(
        serverWriteDelayMs,
        async () => {

            // const allItems = asyncStore.getAll()
            const allItems = await asyncStore.getAll()
            // logDeep( allItems )

            const pendingWriteItems = Array.from( allItems )
                .reduce( ( map, [ key, result ] ) => {
                    if (
                        result.success &&
                        result.data[ freerstoreSectionKey ].pendingWriteToServer
                    ) {
                        delete result.data[ freerstoreSectionKey ].pendingWriteToServer
                        map.set( key, result.data )
                    }
                    return map
                }, new Map<string, Data>() )

            // logDeep( pendingWriteItems )

            if ( pendingWriteItems.size == 0 ) return

            // TODO handle this case
            if ( pendingWriteItems.size > 100 ) throw new Error( 'Too many pending write items' )

            const batch = firestore.writeBatch( firestoreDB )
            pendingWriteItems.forEach( ( data, id ) => {
                // logDeep( firestore.doc( collectionRef, id ).id )
                // logDeep( data[ freerstoreSectionKey ][ modifiedAtKey ] )
                // batch.set( firestore.doc( collectionRef, id ), {
                //     vin: '11111111111111111',
                //     metadata: {
                //         modified: data[ freerstoreSectionKey ][ modifiedAtKey ],
                //         // modified: new Date(),
                //     }
                // } )
                batch.set( firestore.doc( collectionRef, id ), data )
            } )
            await batch.commit()
        }
    )

    // TODO deal with committing pending writes after a long time being offline
    // commitPendingWriteItems()

    type ParseResult = {
        success: boolean,
        data?: DocData,
        error?: {
            issues: {
                message: string
            }[]
        },
    }

    function localSave ( id: string, docData: DocData ): [ string, ParseResult ] {
        const result = freerstoreDocSchema.safeParse( docData )

        if ( result.success ) {
            const keys = new Set( Object.keys( result.data ) )
            keys.delete( freerstoreSectionKey )
            if ( keys.size > 0 ) {
                result.data[ freerstoreSectionKey ].pendingWriteToServer = true
                asyncStore.set(
                    firestore.doc( collectionRef, id ).id,
                    result.data
                )
            } else {
                const dataString = JSON.stringify( docData )
                const message = `data is empty: ${ id }: ${ dataString }`
                return [ id, {
                    success: false,
                    error: { issues: [ { message } ] }
                } ]
            }
        } else {
            if ( !result.success ) console.error( result.error?.issues )
        }
        return [ id, result ]
    }

    return {
        serverWriteDelayMs,
        setDoc ( id: string, docData: DocData ): [ string, ParseResult ] {
            const [ , result ] = localSave( id, docData )

            commitPendingWriteItems()
            return [ id, result ]
        },
        setDocs ( record: Record<string, DocData> = {} ) {
            return new Map(
                Object.entries( record )
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