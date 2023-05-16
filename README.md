<div align='center'>
    <!-- <img src='logo.svg' width='200px' alt='Freerstore logo' /> -->
    <h1>Freerstore</h1>
    <h3>Firestore cost optimizer</h3>
</div>

<br>

<div align='center'>
    <a href='https://github.com/JacobWeisenburger' rel='nofollow'>
        <img alt='Created by Jacob Weisenburger'
            src='https://img.shields.io/badge/created%20by-Jacob%20Weisenburger-274D82.svg'>
    </a>
    <a href='https://github.com/JacobWeisenburger/freerstore/stargazers' rel='nofollow'>
        <img alt='stars' src='https://img.shields.io/github/stars/JacobWeisenburger/freerstore?color=blue'>
    </a>
</div>

<div align='center'>
    <a href='https://www.npmjs.com/package/freerstore' rel='nofollow' target='_blank'>
        <img alt='npm' src='https://img.shields.io/npm/v/freerstore?color=blue'>
    </a>
    <a href='https://www.npmjs.com/package/freerstore' rel='nofollow' target='_blank'>
        <img alt='downloads' src='https://img.shields.io/npm/dw/freerstore?color=blue'>
    </a>
</div>

## Table of contents
- [Purpose](#purpose)
- [Contribute](#contribute)
- [Installation](#installation)
    - [From npm (Node/Bun)](#from-npm-nodebun)
- [Getting Started](#getting-started)
    - [import](#import)
- [TODO](#todo)

## Purpose
To optimize firestore costs by:
- batching and debouncing writes
- caching documents in IndexedDB

To provide a better developer experience by:
- validating documents with `zod`

## Contribute
Always open to ideas. Positive or negative, all are welcome. Feel free to contribute an [issue](https://github.com/JacobWeisenburger/freerstore/issues) or [PR](https://github.com/JacobWeisenburger/freerstore/pulls).

## Installation
[npmjs.com/package/freerstore](https://www.npmjs.com/package/freerstore)
```sh
npm install freerstore firebase zod
```

## Getting Started

```ts
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
    name: collectionName,
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
```

## TODO
Always open to ideas. Positive or negative, all are welcome. Feel free to contribute an [issue](https://github.com/JacobWeisenburger/freerstore/issues) or [PR](https://github.com/JacobWeisenburger/freerstore/pulls).
- Logo
- GitHub Actions
    - Auto publish to npm