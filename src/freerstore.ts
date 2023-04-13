import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import { storage } from './storage.js'
import { getExeCtx } from './getExeCtx.js'
import { firestoreStats } from './firestoreStats.js'
import { makeLastSync } from './makeLastSync.js'
import { firestore } from './firestore/index.js'

export type UnknownObj = Record<string, unknown>

export type FreerstoreMetaData = {
    /** ISO date string */
    modifiedAt: string
}
export type FreerstoreDocData<DocData extends UnknownObj> = DocData & {
    freerstore: FreerstoreMetaData
}

export type Result<DocData extends UnknownObj> = z.SafeParseReturnType<
    DocData,
    FreerstoreDocData<DocData>
>

export type ResultsMap<DocData extends UnknownObj> = Map<string, Result<DocData>>

function getStorageKey ( ref: firestore.Ref, suffix: string = '' ): string {
    const ext = getExeCtx() == 'node' ? '.json' : ''
    suffix = suffix ? `.${ suffix }` : ''
    return `${ ref.firestore.app.options.projectId }/${ ref.path }${ suffix }${ ext }`
        .replaceAll( '/', '.' )
        .replaceAll( ' ', '_' )
}

export function getCollection<DocSchema extends z.AnyZodObject> ( {
    firebaseApp, collectionName, documentSchema
}: {
    firebaseApp: FirebaseApp,
    collectionName: string,
    documentSchema: DocSchema,
} ) {
    type DocData = z.infer<DocSchema>

    const firestoreDB = firestore.getFirestore( firebaseApp )

    const collectionRef = firestore.collection(
        firestoreDB, collectionName
    ) as firestore.CollectionReference<DocData>

    const lastSync = makeLastSync( getStorageKey( collectionRef, 'lastSync' ) )

    const freerstoreDocSchema = documentSchema.transform( data => ( {
        ...data,
        freerstore: {
            modifiedAt: new Date().toISOString()
        }
    } ) ) satisfies z.ZodType<FreerstoreDocData<DocData>, z.ZodTypeDef, DocData>

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
        setDoc (
            id: string, docData: DocData
        ): Result<DocData> {
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

        onSnapshot ( handler: ( map: ResultsMap<DocData> ) => void ): firestore.Unsubscribe {
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
                firestore.where( 'freerstore.modifiedAt', '>', lastSync.get() )
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