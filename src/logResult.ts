import { z } from 'zod'

export const logResult = ( label?: string ) => ( result: z.SafeParseReturnType<any, any> ) => {
    const { success } = result
    success
        ? console.log( ...[ label, { data: result.data } ].filter( Boolean ) )
        : console.log( ...[ label, { issues: result.error.issues } ].filter( Boolean ) )
}