import { z } from 'zod'
import { FirebaseApp } from 'firebase/app'
import { storage } from './storage.js'
import { getExeCtx } from './getExeCtx.js'
import { firestoreStats } from './firestoreStats.js'
import { makeLastSync } from './makeLastSync.js'
import { firestore } from './firestore/index.js'
import { debounce } from './debounce.js'

export type Result<DocData extends Record<string, unknown>> =
    z.SafeParseReturnType<DocData, DocData>

export type ResultsMap<DocData extends Record<string, unknown>> = Map<string, Result<DocData>>

function getStorageKey ( ref: firestore.Ref, suffix: string = '' ): string {
    const ext = getExeCtx() == 'node' ? '.json' : ''
    suffix = suffix ? `.${ suffix }` : ''
    return `${ ref.firestore.app.options.projectId }/${ ref.path }${ suffix }${ ext }`
        .replaceAll( '/', '.' )
        .replaceAll( ' ', '_' )
}

export function getCollection<DocSchema extends z.AnyZodObject> ( {
    firebaseApp,
    collectionName,
    documentSchema,
    modifiedAtPropPath = 'freerstore.modifiedAt',
    modifiedAtPropType = 'isoString',
}: {
    firebaseApp: FirebaseApp,
    collectionName: string,
    documentSchema: DocSchema,
    modifiedAtPropPath?: string,
    modifiedAtPropType?: 'isoString' | 'date',
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
        if ( result.success ) storage.setItem(
            getStorageKey( firestore.doc( collectionRef, docSnap.id ) ),
            result.data
        )
        return result
    }

    async function writeDoc ( docRef: firestore.DocumentReference, docData: DocData ) {
        storage.setItem( getStorageKey( docRef ), docData )
        await firestore.setDoc( docRef, docData )
        firestoreStats.incrementWrites()
    }

    function validateDocs ( record: Record<string, DocData> = {} ) {
        const results = new Map(
            Object.entries( record ).map( ( [ id, value ] ) => [
                id,
                freerstoreDocSchema.safeParse( value )
            ] )
        )
        return results
    }

    const docsQueue = new Map<string, DocData>()
    const commitDocsQueue = debounce(
        200,
        async () => {
            const batch = firestore.writeBatch( firestoreDB )
            docsQueue.forEach( ( docData, id ) => {
                batch.set(
                    firestore.doc( collectionRef, id ),
                    docData
                )
            } )

            docsQueue.clear()
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
            const results = validateDocs( record )

            results.forEach( ( result, id ) => {
                if ( result.success ) {
                    const keys = new Set( Object.keys( result.data ) )
                    keys.delete( modifiedAtTopLevelKey )
                    if ( keys.size > 0 ) {
                        docsQueue.set( id, result.data )
                    } else {
                        console.error( 'TODO Error' )
                    }
                } else {
                    // TODO perhaps do something with the errors
                }
            } )

            commitDocsQueue()
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