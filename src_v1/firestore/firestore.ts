export {
    getFirestore,
    collection,
    CollectionReference,
    doc,
    DocumentReference,
    getDoc,
    setDoc,
    query,
    where,
    onSnapshot,
    QuerySnapshot,
    QueryDocumentSnapshot,
    writeBatch,
    connectFirestoreEmulator,
} from 'firebase/firestore'

/* 
handles the error:
The requested module 'firebase/firestore' does not provide an export named 'Unsubscribe'
*/
/** Removes the listener when invoked. */
export type Unsubscribe = () => void

import {
    CollectionReference,
    DocumentReference,
} from 'firebase/firestore'

export type Ref = DocumentReference | CollectionReference

import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

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