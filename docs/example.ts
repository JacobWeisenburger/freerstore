import { z } from 'zod'
import { initializeApp } from 'firebase/app'
import { freerstore } from 'freerstore'

// get your firebase config from:
// https://console.firebase.google.com
const firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
}

const firebaseApp = initializeApp( firebaseConfig )

// only supports top level collections currently
// feel free to open a PR to add support for subcollections
const collectionName = 'foobar'

const documentSchema = z.object( {
    name: z.string(),
    exp: z.number(),
} )
type DocumentData = z.infer<typeof documentSchema>
// type DocumentData = {
//     name: string
//     exp: number
// }

const collection = freerstore.getCollection( {
    firebaseApp,
    collectionName,
    documentSchema,
} )

const unsubscribe = collection.onSnapshot( resultsMap => {
    // resultsMap: Map<string, z.SafeParseReturnType>

    // Do something with the results
    resultsMap.forEach( ( result, id ) => {
        if ( result.success ) {
            // result.data: DocumentData & {
            //     freerstore: {
            //         modifiedAt: string /* ISO date string */
            //     }
            // }
            console.log( id, result.data )
        } else {
            // result.error: ZodError
            console.error( id, result.error )
        }
    } )
} )

setTimeout( () => {
    /* setDocs handles batches for you */
    collection.setDocs( {
        someId1: { name: 'Frodo', exp: 13 },
        someId2: { name: 'Aragorn', exp: 87 },
        someId3: { name: 'Gandalf', exp: 9999 },
    } )
}, 1000 )

// unsubscribe at some point to prevent memory leaks 
setTimeout( () => {
    unsubscribe()
}, 10_000 )