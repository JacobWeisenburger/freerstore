export {
    collection,
    CollectionReference, connectFirestoreEmulator, doc,
    DocumentReference, Firestore, getDoc, onSnapshot, query,
    QueryConstraint, QueryDocumentSnapshot, QuerySnapshot, setDoc, where, writeBatch
} from 'firebase/firestore'

import { Result } from '@weis-guys/result'
import { FirebaseApp } from 'firebase/app'
import { CollectionReference, DocumentReference, getFirestore, Timestamp } from 'firebase/firestore'
import { z } from 'zod'

/* 
handles the error:
The requested module 'firebase/firestore' does not provide an export named 'Unsubscribe'
*/
/** Removes the listener when invoked. */
export type Unsubscribe = () => void

export type Ref = DocumentReference | CollectionReference

export const dateSchema = z.union( [
    z.date(),
    z.string().pipe( z.coerce.date() ),
    z.unknown().transform( ( x, ctx ) => {
        if (
            x
            && typeof x == 'object'
            && 'toISOString' in x
            && typeof x.toISOString == 'function'
        ) return new Date( x.toISOString() )
        ctx.addIssue( { code: 'invalid_date' } )
    } ),
    z.object( {
        seconds: z.number(),
        nanoseconds: z.number(),
    } ).transform( x => new Timestamp( x.seconds, x.nanoseconds ).toDate() ),
] )

export const isoStringSchema = dateSchema.transform( x => x?.toISOString() )

export function getFirestoreResult ( firebaseApp: FirebaseApp ) {
    try {
        const firestoreDB = getFirestore( firebaseApp )
        return Result.ok( firestoreDB )
    } catch ( error ) {
        return Result.err( error as Error )
    }
}