import { stringify } from './stringify.js'

export module storage {
    export function getItem ( key: string ): unknown {
        const persistedValue = localStorage.getItem( key )
        const value = persistedValue == 'undefined' ? null : persistedValue
        try {
            return JSON.parse( value ?? 'null' )
        } catch ( error ) {
            return value
        }
    }
    export function setItem ( key: string, docData: any ) {
        localStorage.setItem( key, stringify( docData ) )
    }
    export function removeItem ( key: string ) {
        localStorage.removeItem( key )
    }
    export function filter ( cb: ( key: string, data: unknown ) => boolean ) {
        return Array.from( getAllItems() ).filter( ( [ key, data ] ) => cb( key, data ) )
    }
    function getAllItems () {
        const map = new Map<string, unknown>()
        for ( let i = 0; i < localStorage.length; i++ ) {
            const key = localStorage.key( i )
            const data = key ? getItem( key ) : undefined
            if ( key && data ) map.set( key, data )
        }
        return map
    }
}