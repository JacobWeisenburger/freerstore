import { Firestore } from 'firebase/firestore'

export function firestore ( firestore: Firestore ) {
    console.group( 'firestore' )
    // console.log( firestore.constructor.name )
    console.log( 'firestore instanceof Firestore', firestore instanceof Firestore )
    console.groupEnd()
}
export function bar () {
    console.group( 'makeBar' )
    const bar = new Bar()
    // console.log( bar.constructor.name )
    console.log( 'bar instanceof Bar', bar instanceof Bar )
    console.groupEnd()
}

class Bar { }