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
}