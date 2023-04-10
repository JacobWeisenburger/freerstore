// // https://github.com/denoland/dnt/
// import { build, emptyDir } from 'dnt'

// await emptyDir( './npm' )

// await build( {
//     package: {
//         name: 'freerstore',
//         version: '0.0.1',
//         author: 'JacobWeisenburger',
//         description: '',
//         license: 'MIT',
//         // npm: 'https://www.npmjs.com/package/freerstore',
//         // deno: 'https://deno.land/x/freerstore',
//         // repository: 'https://github.com/JacobWeisenburger/freerstore',
//         // homepage: 'https://github.com/JacobWeisenburger/freerstore',
//     },
//     typeCheck: false,
//     skipSourceOutput: true,
//     entryPoints: [ './mod.ts' ],
//     importMap: './import_map.json',
//     outDir: './npm',
//     shims: { deno: true, undici: true },
//     mappings: {
//         'https://deno.land/x/zod@v3.21.4/mod.ts': {
//             name: 'zod',
//             version: '^3.21.4',
//             peerDependency: true,
//         },
//         'firebase/app': {
//             name: 'firebase',
//             version: '9.17.2',
//             subPath: 'app',
//             peerDependency: true,
//         },
//     },
// } )

// try {
//     await Deno.copyFile( 'LICENSE', 'npm/LICENSE' )
// } catch ( error ) {
//     console.error( error )
// }

// try {
//     await Deno.copyFile( 'README.md', 'npm/README.md' )
// } catch ( error ) {
//     console.error( error )
// }