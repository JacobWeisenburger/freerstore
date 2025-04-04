import { z } from 'zod'
import { Firestore } from './Firestore'
import { ModifiedAtPropType } from './types'
import { pretty, prune } from './utils'
import { cluster } from 'radash'
import { Result } from '@weis-guys/result'

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2F_test-collection

function debounce<Fn extends ( ...args: any[] ) => any> (
    delayMS: number,
    func: Fn
) {
    let timer: NodeJS.Timeout | undefined
    return ( ...args: Parameters<Fn> ) => {
        // console.log( 'debounced', args )

        return new Promise<ReturnType<Fn>>( resolve => {
            clearTimeout( timer )
            timer = setTimeout( () => { resolve( func( ...args ) ) }, delayMS )
        } )
    }
}

export namespace Freerstore {
    export function getCollection ( { firestore, ...props }: {
        firestore: Firestore.Firestore,
        path: string,
        freerstoreSectionKey?: string,
        modifiedAtKey?: string,
        modifiedAtType?: ModifiedAtPropType,
        serverWriteDelayMs?: number,
    } ) {
        props.freerstoreSectionKey ??= 'freerstore'
        props.modifiedAtKey ??= 'modifiedAt'
        props.modifiedAtType ??= 'isoString'
        props.serverWriteDelayMs ??= 1000

        const {
            freerstoreSectionKey,
            modifiedAtKey,
            modifiedAtType,
            serverWriteDelayMs,
            path,
        } = props

        const idSchema = z.string()
        const dataSchema = z.record( z.unknown() )
            .transform( data => ( {
                ...data,
                [ freerstoreSectionKey ]: {
                    [ modifiedAtKey ]: {
                        isoString: new Date().toISOString(),
                        date: new Date(),
                    }[ modifiedAtType ],
                },
            } ) )
        type Data = z.infer<typeof dataSchema>

        const collectionRef = Firestore.collection( firestore, path ) as Firestore.CollectionReference

        const pendingWriteMap = new Map<string, Data>()
        const makeBatches = debounce(
            serverWriteDelayMs,
            async () => {
                // emit( 'serverWriteStart' )

                const parseResults = [ ...pendingWriteMap ].reduce( ( acc, [ id, data ] ) => {
                    pendingWriteMap.delete( id )

                    const parsedId = idSchema.safeParse( id )
                    if ( !parsedId.success ) {
                        const result = Result( {
                            data, error: [
                                `Invalid Id: ${ id }`,
                                ...parsedId.error.format()._errors,
                            ] as string[]
                        } )
                        acc.fail.set( id, result )
                        return acc
                    }

                    const parsed = dataSchema.safeParse( data )
                    if ( !parsed.success ) {
                        const result = Result( {
                            data, error: [
                                `Invalid Data`,
                                ...parsed.error.format()._errors,
                            ] as string[]
                        } )
                        acc.fail.set( id, result )
                        return acc
                    }

                    acc.success.set( parsedId.data, prune( parsed.data ) )
                    return acc
                }, {
                    success: new Map<string, Data>(),
                    fail: new Map<string, Result<unknown, string[]>>(),
                } )

                const groups = cluster( [ ...parseResults.success ], 500 )

                const results = {
                    success: new Map<string, Data>(),
                    fail: new Map<string, Result<unknown, unknown>>( parseResults.fail ),
                }

                const batches = await Promise.all(
                    groups.map( async entries => {
                        const batch = Firestore.writeBatch( firestore )
                        entries.forEach( ( [ id, data ] ) => {
                            try {
                                batch.set( Firestore.doc( collectionRef, id ), data )
                                results.success.set( id, data )
                            } catch ( error ) {
                                if ( error instanceof Error ) {
                                    results.fail.set( id, Result( { data, error: error.message } ) )
                                } else {
                                    console.error( error )
                                    results.fail.set( id, Result( { data, error: 'check console for error' } ) )
                                }
                            }
                        } )
                        return batch
                    } )
                )

                return { results, batches }
                // emit( 'serverWriteEnd' )
            }
        )

        return {
            props,







            // Not sure how to make setDoc return results for just that one doc
            // while still auto batching
            async setDoc ( id: string, data: Data ) {
                pendingWriteMap.set( id, data )
                const { results, batches } = await makeBatches()
                // batches.forEach( x => x.commit() )
                return results
            },











            setDocs ( docs: Record<string, Data> = {} ) {
                // return new Map(
                //     Object.entries( docs )
                //         .map( ( [ id, docData ] ) => this.setDoc( id, docData ) )
                // )
            },
        }
    }
}


// const modifiedAtPropPath = [ freerstoreSectionKey, modifiedAtKey ].join( '.' )

// const lastSync = makeLastSync( {
//     dbName: dbName,
//     storeName: key,
//     modifiedAtType: modifiedAtType,
// } )

// const asyncStore = LocalDB
//     .db( dbName )
//     .asyncStore( key )

// asyncStore.setItem( 'foo', 'foo' )
// console.log( await asyncStore.getAll() )

// query ( ...queryConstraints: Firestore.QueryConstraint[] ) {
//     return Firestore.query(
//         collectionRef,
//         ...queryConstraints,
//         Firestore.where( modifiedAtPropPath, '>', lastSync.get() )
//     )
// },
// async getDocFromCache ( id: string ): Promise<ResultEntry> {
//     return [ id, await asyncStore.get( id ) ]
// },
// async getAllFromCache (): Promise<DocResultsMap> {
//     return asyncStore.getAll()
// },