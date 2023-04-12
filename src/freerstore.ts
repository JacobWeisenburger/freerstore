import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import {
    getFirestore,
    collection as _collection,
    doc as _doc,
    getDoc as _getDoc,
    setDoc as _setDoc,
    query as _query,
    where as _where,
    onSnapshot as _onSnapshot,
    CollectionReference,
    DocumentReference,
    Unsubscribe,
    QuerySnapshot,
} from 'firebase/firestore'
import { storage } from './storage.js'
import { getExeCtx } from './getExeCtx.js'
import { firestoreStats } from './firestoreStats.js'
import { formatDateTime } from './formatDateTime.js'
import { logResult } from './logResult.js'

const freerstoreSetterSchema = z.object( {
    modified: z.string().datetime(),
} )

// const freerstoreGetterSchema = freerstoreSetterSchema.extend( {
//     from: z.enum( [ 'cache', 'server' ] ),
// } )

export module freerstore {

    export function getStorageKey (
        ref: DocumentReference | CollectionReference,
        suffix: string = '',
    ): string {
        const ext = getExeCtx() == 'node' ? '.json' : ''
        suffix = suffix ? `.${ suffix }` : ''
        return `${ ref.firestore.app.options.projectId }/${ ref.path }${ suffix }${ ext }`
            .replaceAll( '/', '.' )
            .replaceAll( ' ', '_' )
    }

    export function getDB ( firebaseApp: FirebaseApp ) {
        const firestore = getFirestore( firebaseApp )
        return {
            firestore,
            getCollection<DocSchema extends z.AnyZodObject> (
                collectionName: string,
                docSchema: DocSchema,
            ) {
                type DocData = z.infer<DocSchema>

                const setterSchema = docSchema.extend( {
                    freerstore: freerstoreSetterSchema,
                } )
                type DocDataWithFreerstore = z.infer<typeof setterSchema>

                // const getterSchema = docSchema.extend( {
                //     freerstore: freerstoreGetterSchema,
                // } )

                const collectionRef = _collection(
                    firestore, collectionName
                ).withConverter( {
                    // toFirestore: x => x,
                    toFirestore ( docDataUnknown: unknown ) {
                        console.log( 'toFirestore:', docDataUnknown )

                        const docDataResult = docSchema.safeParse( docDataUnknown )

                        if ( docDataResult.success ) {
                            const newData: DocDataWithFreerstore = {
                                ...docDataResult.data,
                                freerstore: {
                                    modified: new Date().toISOString(),
                                },
                            }

                            const docRef = _doc( collectionRef, id )
                            const storageKey = getStorageKey( docRef )
                            storage.setItem( storageKey, newData )
                            firestoreStats.incrementWrites()
                            // logResult( 'toFirestore:' )( result )
                            return newData
                        }




                        // if ( result.success ) {
                        //     const docRef = _doc( collectionRef, id )
                        //     const storageKey = getStorageKey( docRef )
                        //     storage.setItem( storageKey, result.data )
                        //     _setDoc( docRef, result.data )
                        //     firestoreStats.incrementWrites()
                        // }

                        // return result

                        return docDataUnknown as any
                    },
                    fromFirestore ( doc ) {
                        // const data = doc.data()
                        // delete data.freerstore
                        const docRef = _doc( collectionRef, doc.id )
                        const storageKey = getStorageKey( docRef )

                        const docDataUnknown = doc.data()
                        if ( docDataUnknown ) {
                            // const docDataResult = docSchema.safeParse( docDataUnknown )
                            const docDataResult = setterSchema.safeParse( docDataUnknown )
                            if ( docDataResult.success ) {
                                storage.setItem( storageKey, docDataResult.data )
                                return docDataResult.data
                                // return getterSchema.safeParse( {
                                //     ...docDataResult.data,
                                //     freerstore: {
                                //         ...docDataResult.data.freerstore,
                                //         from: 'server',
                                //     },
                                // } as z.infer<typeof getterSchema> )
                            }
                        }

                        // return { id: doc.id, ...data }
                    }
                }
                ) as CollectionReference<DocData>

                const lastSync = {
                    storageKey: freerstore.getStorageKey( collectionRef, 'lastSync' ),
                    get () {
                        const persistedLastSync = storage.getItem( lastSync.storageKey )
                        return persistedLastSync
                            ? persistedLastSync
                            : new Date( 0 ).toISOString()
                    },
                    set ( date: Date = new Date() ) {
                        console.log( 'lastSync.set:', formatDateTime( date ) )
                        storage.setItem( lastSync.storageKey, date.toISOString() )
                    },
                }

                type QuerySnapshotHandler = ( snap: QuerySnapshot<DocData> ) => void

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
                    async setDoc ( id: string, docData: DocData ) {
                        const result = setterSchema.safeParse( {
                            ...docData,
                            freerstore: {
                                modified: new Date().toISOString(),
                            },
                        } )

                        if ( result.success ) {
                            const docRef = _doc( collectionRef, id )
                            const storageKey = getStorageKey( docRef )
                            storage.setItem( storageKey, result.data )
                            _setDoc( docRef, result.data )
                            firestoreStats.incrementWrites()
                        }

                        return result
                    },
                    async setDocs ( record: Record<string, DocData> = {} ) {
                        /* TODO handle batching */

                        // console.log( 'setDocs():', record )
                        await Promise.all(
                            Object.entries( record ).map( ( [ key, value ] ) => {
                                // console.log( 'setDocs():', key, value )
                                return collection.setDoc( key, value )
                            } )
                        )
                        // console.log( 'setDocs():', 'done' )
                    },

                    onQuerySnapshot ( handler: QuerySnapshotHandler ): Unsubscribe {
                        /* 
                        restart onSnapshot with new lastSync after each batch
                        this prevents docs that were changed after lastSync from being
                        included in every batch until the next restart
                        */

                        let unsub: Unsubscribe = () => { }

                        const handleSnapshot = ( snap: QuerySnapshot ) => {
                            lastSync.set()
                            if ( snap.empty ) return

                            firestoreStats.incrementReads( snap.size )
                            handler( snap )
                            initOnSnapshot()
                        }

                        const initQuery = () => _query(
                            collectionRef,
                            _where( 'freerstore.modified', '>', lastSync.get() )
                        )

                        const initOnSnapshot = () => {
                            console.log( initOnSnapshot.name )
                            unsub()
                            unsub = _onSnapshot( initQuery(), handleSnapshot )
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