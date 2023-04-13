import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import { storage } from './storage.js'
import { getExeCtx } from './getExeCtx.js'
import { firestoreStats } from './firestoreStats.js'
import { makeLastSync } from './makeLastSync.js'
import { firestore } from './firestore/index.js'

export module freerstore {

    export function getStorageKey ( ref: firestore.Ref, suffix: string = '' ): string {
        const ext = getExeCtx() == 'node' ? '.json' : ''
        suffix = suffix ? `.${ suffix }` : ''
        return `${ ref.firestore.app.options.projectId }/${ ref.path }${ suffix }${ ext }`
            .replaceAll( '/', '.' )
            .replaceAll( ' ', '_' )
    }

    export function getDB ( firebaseApp: FirebaseApp ) {
        const firestoreDB = firestore.getFirestore( firebaseApp )
        return {
            firestoreDB,
            getCollection<DocSchema extends z.AnyZodObject> (
                collectionName: string,
                docSchema: DocSchema,
            ) {
                type DocData = z.infer<DocSchema>

                const collectionRef = firestore.collection(
                    firestoreDB, collectionName
                ) as firestore.CollectionReference<DocData>

                const lastSync = makeLastSync(
                    freerstore.getStorageKey( collectionRef, 'lastSync' )
                )

                const freerstoreDocSchema = docSchema.transform( data => ( {
                    ...data,
                    freerstore: {
                        modified: new Date().toISOString()
                    }
                } ) )
                type FreerstoreDocData = z.infer<typeof freerstoreDocSchema>
                type Result = z.SafeParseReturnType<DocData, FreerstoreDocData>
                type ResultsMap = Map<string, Result>

                function handleQueryDocumentSnapshot (
                    docSnap: firestore.QueryDocumentSnapshot<DocData>
                ) {
                    const result = freerstoreDocSchema.safeParse( docSnap.data() )
                    if ( result.success ) storage.setItem(
                        getStorageKey( firestore.doc( collectionRef, docSnap.id ) ),
                        result.data
                    )

                    return result
                }

                const collection = {
                    // async getDoc ( id: string ) {
                    //     const docRef = _doc( collectionRef, id )
                    //     const storageKey = getStorageKey( docRef )

                    //     const persistedDocDataUnknown = storage.getItem( storageKey )
                    //     if ( persistedDocDataUnknown ) {
                    //         const persistedDocDataResult = setterSchema.safeParse( persistedDocDataUnknown )
                    //         if ( persistedDocDataResult.success ) {
                    //             return getterSchema.safeParse( {
                    //                 ...persistedDocDataResult.data,
                    //                 freerstore: {
                    //                     ...persistedDocDataResult.data.freerstore,
                    //                     from: 'cache',
                    //                 }
                    //             } as z.infer<typeof getterSchema> )
                    //         }
                    //     }

                    //     const docSnap = await _getDoc( docRef )
                    //     firestoreStats.incrementReads()
                    //     const docDataUnknown = docSnap.data()
                    //     if ( docDataUnknown ) {
                    //         const docDataResult = setterSchema.safeParse( docDataUnknown )
                    //         if ( docDataResult.success ) {
                    //             storage.setItem( storageKey, docDataResult.data )

                    //             return getterSchema.safeParse( {
                    //                 ...docDataResult.data,
                    //                 freerstore: {
                    //                     ...docDataResult.data.freerstore,
                    //                     from: 'server',
                    //                 },
                    //             } as z.infer<typeof getterSchema> )
                    //         }
                    //     }

                    //     storage.removeItem( storageKey )
                    //     return getterSchema.safeParse( undefined )
                    // },

                    setDoc (
                        id: string, docData: DocData
                    ): Result {
                        const docDataResult = freerstoreDocSchema.safeParse( docData )

                        if ( docDataResult.success ) {
                            const docRef = firestore.doc( collectionRef, id )
                            storage.setItem( getStorageKey( docRef ), docDataResult.data )
                            firestore.setDoc( docRef, docDataResult.data )
                            firestoreStats.incrementWrites()
                        }

                        return docDataResult
                    },
                    setDocs ( record: Record<string, DocData> = {} ) {
                        /* TODO handle batching */

                        const results = new Map(
                            Object.entries( record ).map( ( [ id, value ] ) => [
                                id,
                                collection.setDoc( id, value ),
                            ] )
                        )
                        console.log( 'results:', results )
                        return results
                    },

                    onSnapshot ( handler: ( map: ResultsMap ) => void ): firestore.Unsubscribe {
                        /* 
                        restart onSnapshot with new lastSync after each batch
                        this prevents docs that were changed after lastSync from being
                        included in every batch until the next restart
                        */

                        let unsub: firestore.Unsubscribe = () => { }

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
                            firestore.where( 'freerstore.modified', '>', lastSync.get() )
                        )

                        const initOnSnapshot = () => {
                            console.log( initOnSnapshot.name )
                            unsub()
                            unsub = firestore.onSnapshot( initQuery(), handlerWrapper )
                        }

                        initOnSnapshot()

                        return () => {
                            unsub()
                            console.log( 'ext unsub' )
                        }
                    }
                }

                return collection
            }
        }
    }
}