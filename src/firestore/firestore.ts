export {
    getFirestore,
    collection,
    CollectionReference,
    doc,
    DocumentReference,
    setDoc,
    query,
    where,
    onSnapshot,
    QuerySnapshot,
    QueryDocumentSnapshot,
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