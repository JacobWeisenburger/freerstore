import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import { kvStorage } from './storage.js'
import { getExeCtx } from './getExeCtx.js'
import { firestoreStats } from './firestoreStats.js'
import { makeLastSync } from './makeLastSync.js'
import { firestore } from './firestore/index.js'
import { debounce } from './debounce.js'

export type Result<DocData extends Record<string, unknown>> =
    z.SafeParseReturnType<DocData, DocData>

export type ResultsMap<DocData extends Record<string, unknown>> = Map<string, Result<DocData>>

function getStoragePath ( ref: firestore.Ref ): string {
    return `${ ref.firestore.app.options.projectId }/${ ref.path }`
        .replaceAll( '/', '.' )
        .replaceAll( ' ', '_' )
}

function getStorageKey ( ref: firestore.Ref, suffix: string = '' ): string {
    const ext = getExeCtx() == 'node' ? '.json' : ''
    const path = getStoragePath( ref )
    suffix = suffix ? `.${ suffix }` : ''
    return `${ path }${ suffix }${ ext }`
        .replaceAll( '/', '.' )
        .replaceAll( ' ', '_' )
}

export function getCollection<DocSchema extends z.AnyZodObject> ( {
    firebaseApp,
    collectionName,
    documentSchema,
    modifiedAtPropPath = 'freerstore.modifiedAt',
    modifiedAtPropType = 'isoString',
    serverWriteDelayMs = 2000,
}: {
    firebaseApp: FirebaseApp,
    collectionName: string,
    documentSchema: DocSchema,
    modifiedAtPropPath?: string,
    modifiedAtPropType?: 'isoString' | 'date',
    serverWriteDelayMs?: number,
} ) {
    type DocData = z.infer<DocSchema>

    const firestoreDB = firestore.getFirestore( firebaseApp )

    const collectionRef = firestore.collection(
        firestoreDB, collectionName
    ) as firestore.CollectionReference<DocData>

    const [ modifiedAtTopLevelKey ] = modifiedAtPropPath.split( '.' )

    const modifiedAtPropSchema = {
        isoString: firestore.isoStringSchema,
        date: firestore.dateSchema,
    }[ modifiedAtPropType ]

    const lastSync = makeLastSync( {
        storageKey: getStorageKey( collectionRef, 'lastSync' ),
        schema: modifiedAtPropSchema,
    } )

    const freerstoreDocSchema = documentSchema.transform( docData => {
        const value = {
            isoString: new Date().toISOString(),
            date: new Date(),
        }[ modifiedAtPropType ]

        const modifiedAtPropTree = modifiedAtPropPath
            .split( '.' )
            .reverse()
            .reduce( ( value, key ) => ( { [ key ]: value } ), value as object )

        return { ...docData, ...modifiedAtPropTree }
    } )

    function handleQueryDocumentSnapshot (
        docSnap: firestore.QueryDocumentSnapshot<DocData>
    ) {
        const result = freerstoreDocSchema.safeParse( docSnap.data() )
        if ( result.success ) kvStorage.setItem(
            getStorageKey( firestore.doc( collectionRef, docSnap.id ) ),
            result.data
        )
        return result
    }

    async function writeDoc ( docRef: firestore.DocumentReference, docData: DocData ) {
        // setDocInStorage( docRef, docData )
        await firestore.setDoc( docRef, docData )
        firestoreStats.incrementWrites()
    }

    function setDocInStorage ( docRef: firestore.DocumentReference, docData: DocData ) {
        kvStorage.setItem( getStorageKey( docRef ), docData )
    }

    function getIdFromStoragePath ( path: string ): string {
        return path.split( collectionRef.path )[ 1 ].split( '.' )[ 1 ]
    }

    const commitPendingWriteItems = debounce(
        serverWriteDelayMs,
        async () => {
            const pendingWriteItems = kvStorage.filter( ( path, data ) =>
                path.startsWith( getStoragePath( collectionRef ) ) &&
                z.object( {
                    [ modifiedAtTopLevelKey ]: z.object( {
                        pendingWriteToServer: z.literal( true ),
                    } ),
                } ).safeParse( data ).success
            )

            const docsQueue = Array.from( pendingWriteItems ).map( ( [ path, data ] ) => [
                getIdFromStoragePath( path ),
                freerstoreDocSchema.safeParse( data )
            ] ) as [ string, z.SafeParseReturnType<DocData, DocData> ][]

            const batch = firestore.writeBatch( firestoreDB )
            docsQueue.forEach( ( [ id, docResult ] ) => {
                if ( docResult.success ) batch.set(
                    firestore.doc( collectionRef, id ),
                    docResult.data
                )
            } )

            await batch.commit()
        }
    )

    return {
        setDoc ( id: string, docData: DocData ): Result<DocData> {
            const result = freerstoreDocSchema.safeParse( docData )
            if ( result.success ) writeDoc(
                firestore.doc( collectionRef, id ),
                result.data
            )
            return result
        },
        async setDocs ( record: Record<string, DocData> = {} ) {
            type Result = {
                success: boolean,
                data?: DocData,
                error?: {
                    issues: {
                        message: string
                    }[]
                },
            }

            const results = new Map<string, Result>(
                Object.entries( record ).map( ( [ id, value ] ) => {
                    const result = freerstoreDocSchema.safeParse( value )
                    if ( result.success ) {
                        const keys = new Set( Object.keys( result.data ) )
                        keys.delete( modifiedAtTopLevelKey )
                        if ( keys.size > 0 ) {
                            setDocInStorage(
                                firestore.doc( collectionRef, id ),
                                {
                                    ...result.data,
                                    [ modifiedAtTopLevelKey ]: {
                                        ...result.data[ modifiedAtTopLevelKey ],
                                        pendingWriteToServer: true,
                                    },
                                }
                            )
                        } else {
                            const dataString = JSON.stringify( record[ id ] )
                            const message = `data is empty: ${ id }: ${ dataString }`
                            return [ id, {
                                success: false,
                                error: { issues: [ { message } ] }
                            } ]
                        }
                    } else {
                        // TODO perhaps do something with the errors
                    }
                    return [ id, result ]
                } )
            )

            // console.dir( { results }, { depth: Infinity } )
            commitPendingWriteItems()
            return results
        },

        onSnapshot ( handler: ( map: ResultsMap<DocData> ) => void ): firestore.Unsubscribe {
            /* 
            Restart onSnapshot with new lastSync.get() after each batch.
            This prevents docs that were changed after lastSync from
            being included in every batch until the next restart.
            */

            let unsubscribe: firestore.Unsubscribe = () => { }

            const handlerWrapper = ( snap: firestore.QuerySnapshot<DocData> ) => {
                lastSync.set()
                if ( snap.empty ) return

                firestoreStats.incrementReads( snap.size )
                handler( new Map(
                    snap.docs.map( docSnap => [
                        docSnap.id,
                        handleQueryDocumentSnapshot( docSnap )
                    ] )
                ) )
                initOnSnapshot()
            }

            const initQuery = () => firestore.query(
                collectionRef,
                firestore.where( modifiedAtPropPath, '>', lastSync.get() )
            )

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