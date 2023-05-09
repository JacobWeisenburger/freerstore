import localforage from 'localforage'
import { z } from 'zod'
import { getExeCtx } from './getExeCtx'
import { logDeep, safeParseJSON } from './utils'

// https://localforage.github.io/localForage/

export module LocalDB {

    type Path = {
        dbName: string,
        storeName: string,
        key: string,
        ext?: string,
    }

    export function db ( name: string ) {
        const db = {
            name,
            asyncStore<Schema extends z.Schema> (
                name: string,
                schema: Schema,
            ) {
                type Input = z.input<Schema>
                type Output = z.output<Schema>
                type Result = z.SafeParseReturnType<Input, Output>

                const store = localforage.createInstance( {
                    name: db.name,
                    storeName: name,
                    driver: localforage.INDEXEDDB,
                } )

                async function get ( key: string ) {
                    const value = await store.getItem( key )
                    return schema.safeParse( value )
                }

                async function getAll () {
                    const map = new Map<string, Result>()
                    await store.iterate( ( value, key ) => {
                        map.set( key, schema.safeParse( value ) )
                    } )
                    return map
                }

                return {
                    name,
                    getAll,
                    get,
                    async set ( key: string, input: Input ) {
                        const parsed = schema.safeParse( input )
                        if ( parsed.success ) await store.setItem( key, parsed.data )
                        return parsed
                    },
                    async remove ( key: string ) {
                        return store.removeItem( key )
                    },
                }
            },
            syncStore<Schema extends z.Schema> (
                name: string,
                schema: Schema,
            ) {
                type Input = z.input<Schema>
                type Output = z.output<Schema>
                type Result = z.SafeParseReturnType<Input, Output>

                function stringify ( data: any ) {
                    const spaces = getExeCtx() == 'node' ? 4 : 0
                    return JSON.stringify( data, null, spaces )
                }

                const delimiter = getExeCtx() == 'node' ? '~' : '/'
                function pathToString ( path: Path ): string {
                    const { dbName, storeName, key, ext } = path
                    return [
                        [ dbName, storeName, key ].join( delimiter ),
                        ext
                    ].filter( Boolean ).join( '.' )
                }

                function pathStringFromKey ( key: string ): string {
                    return pathToString( {
                        dbName: db.name,
                        storeName: name,
                        key,
                        ext: getExeCtx() == 'node' ? 'json' : undefined,
                    } )
                }

                function get ( key: string ): Result {
                    const pathString = pathStringFromKey( key )
                    const persistedValue = localStorage.getItem( pathString )
                    const value = persistedValue == 'undefined' ? null : persistedValue
                    const parsed = schema.safeParse( safeParseJSON( value ?? 'null' ) )
                    return parsed
                }

                function parsePath ( x: unknown ) {
                    return z.string()
                        .transform( x => x.split( delimiter ) )
                        .pipe( z.string().array().length( 3 ) )
                        .transform( ( [ dbName, storeName, keyAndExt ] ): Path => {
                            const [ key, ext ] = keyAndExt.split( '.' )
                            return { dbName, storeName, key, ext }
                        } ).safeParse( x )
                }

                function getAll (): Map<string, Result> {
                    const map = new Map()
                    for ( let i = 0; i < localStorage.length; i++ ) {
                        const pathString = localStorage.key( i )

                        const parsedPath = parsePath( pathString )
                        if ( !parsedPath.success ) continue

                        const { dbName, storeName, key } = parsedPath.data
                        if ( !( db.name == dbName && name == storeName ) ) continue

                        const result = pathString ? get( key ) : undefined
                        if ( pathString && result ) map.set( key, result )
                    }
                    return map
                }

                return {
                    name,
                    get,
                    getAll,
                    pathStringFromKey,
                    parsePath,
                    set ( key: string, input: Input ) {
                        const pathString = pathStringFromKey( key )
                        const parsed = schema.safeParse( input )
                        if ( parsed.success ) {
                            localStorage.setItem( pathString, stringify( parsed.data ) )
                        }
                        return parsed
                    },
                    remove ( key: string ) {
                        const pathString = pathStringFromKey( key )
                        localStorage.removeItem( pathString )
                    },
                }
            }
        }

        return db
    }

}