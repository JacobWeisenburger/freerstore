import localforage from 'localforage'
import { getExeCtx, safeParseJSON } from './utils'
import { z } from 'zod'

// https://localforage.github.io/localForage/

export namespace LocalDB {

    type Path = {
        dbName: string,
        storeName: string,
        key: string,
        ext?: string,
    }

    export function db ( name: string ) {
        const db = {
            name,
            asyncStore ( name: string ) {
                const store = localforage.createInstance( {
                    name: db.name,
                    storeName: name,
                    driver: localforage.INDEXEDDB,
                } )

                /* init asyncStore with no data */
                store.ready()

                return {
                    name,
                    getItem: store.getItem,
                    setItem: store.setItem,
                    removeItem: store.removeItem,
                    async getAll () {
                        const map = new Map<string, unknown>()
                        await store.iterate( ( value, key ) => { map.set( key, value ) } )
                        return map
                    },
                }
            },

            syncStore ( name: string ) {
                function stringify ( data: any ) {
                    const spaces = getExeCtx() == 'server' ? 4 : 0
                    return JSON.stringify( data, null, spaces )
                }

                const delimiter = getExeCtx() == 'server' ? '~' : '/'
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
                        ext: getExeCtx() == 'server' ? 'json' : undefined,
                    } )
                }

                function get ( key: string ) {
                    const pathString = pathStringFromKey( key )
                    const persistedValue = localStorage.getItem( pathString )
                    const value = persistedValue == 'undefined' ? null : persistedValue
                    return safeParseJSON( value ?? 'null' )
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

                function getAll () {
                    const map = new Map<string, unknown>()
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
                    set ( key: string, data: unknown ) {
                        const pathString = pathStringFromKey( key )
                        localStorage.setItem( pathString, stringify( data ) )
                        return { key, data }
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