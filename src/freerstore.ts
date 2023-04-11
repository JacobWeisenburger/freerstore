import { z } from 'zod'
// import { zu } from 'zod_utilz'
import { FirebaseApp } from 'firebase/app'
import {
    getFirestore,
    collection, CollectionReference,
    doc, getDoc, setDoc, DocumentReference,
} from 'firebase/firestore'
import { storage } from './storage.js'
import { getExeCtx } from './getExeCtx.js'
import { firestoreStats } from './firestoreStats.js'

const freerstoreSetterSchema = z.object( {
    modified: z.string().datetime(),
} )

const freerstoreGetterSchema = freerstoreSetterSchema.extend( {
    from: z.enum( [ 'cache', 'server' ] ),
} )


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

                const collectionRef = collection(
                    firestore, collectionName
                ) as CollectionReference<DocData>

                const setterSchema = docSchema.extend( {
                    freerstore: freerstoreSetterSchema,
                } )

                const getterSchema = docSchema.extend( {
                    // id: z.string(),
                    freerstore: freerstoreGetterSchema,
                } )

                return {
                    ref: collectionRef,
                    async getDoc ( id: string ) {
                        const docRef = doc( collectionRef, id )
                        const storageKey = getStorageKey( docRef )

                        const persistedDocDataUnknown = storage.getItem( storageKey )
                        if ( persistedDocDataUnknown ) {
                            const persistedDocDataResult = setterSchema.safeParse( persistedDocDataUnknown )
                            if ( persistedDocDataResult.success ) {
                                return getterSchema.safeParse( {
                                    ...persistedDocDataResult.data,
                                    freerstore: {
                                        ...persistedDocDataResult.data.freerstore,
                                        from: 'cache',
                                    }
                                } as z.infer<typeof getterSchema> )
                            }
                        }

                        const docSnap = await getDoc( docRef )
                        firestoreStats.incrementReads()
                        const docDataUnknown = docSnap.data()
                        if ( docDataUnknown ) {
                            const docDataResult = setterSchema.safeParse( docDataUnknown )
                            if ( docDataResult.success ) {
                                storage.setItem( storageKey, docDataResult.data )

                                return getterSchema.safeParse( {
                                    ...docDataResult.data,
                                    freerstore: {
                                        ...docDataResult.data.freerstore,
                                        from: 'server',
                                    },
                                } as z.infer<typeof getterSchema> )
                            }
                        }

                        storage.removeItem( storageKey )
                        return getterSchema.safeParse( undefined )
                    },
                    async setDoc ( id: string, docData: DocData ) {
                        const result = setterSchema.safeParse( {
                            ...docData,
                            freerstore: {
                                modified: new Date().toISOString(),
                            },
                        } )

                        if ( result.success ) {
                            const docRef = doc( collectionRef, id )
                            const storageKey = getStorageKey( docRef )
                            storage.setItem( storageKey, result.data )
                            setDoc( docRef, result.data )
                            firestoreStats.incrementWrites()
                        }

                        return result
                    },
                }
            }
        }
    }
}