<!-- <div align='center'>
    <img src='logo.svg' width='200px' alt='Zod Utilz logo' />
    <h1>Zod Utilz</h1>
    <h3>
        Framework agnostic utilities for
        <a href='https://github.com/colinhacks/zod' rel='nofollow'>
            Zod
        </a>
    </h3>
</div> -->

<br>

<div align='center'>
    <a href='https://github.com/JacobWeisenburger' rel='nofollow'>
        <img alt='Created by Jacob Weisenburger'
            src='https://img.shields.io/badge/created%20by-Jacob%20Weisenburger-274D82.svg'>
    </a>
    <!-- <a href='https://github.com/JacobWeisenburger/freerstore/stargazers' rel='nofollow'>
        <img alt='stars' src='https://img.shields.io/github/stars/JacobWeisenburger/freerstore?color=blue'>
    </a> -->
    <!-- <a href='https://www.npmjs.com/package/freerstore' rel='nofollow'>
        <img alt='downloads' src='https://img.shields.io/npm/dw/freerstore?color=blue'>
    </a> -->
</div>

<!-- <div align='center'>
    <a href='https://www.npmjs.com/package/freerstore' rel='nofollow'>
        <img alt='npm' src='https://img.shields.io/npm/v/freerstore?color=blue'>
    </a>
    <a href='https://deno.land/x/freerstore' rel='nofollow'>
        <img alt='deno' src='https://shield.deno.dev/x/freerstore'>
    </a>
</div> -->

## Table of contents
- [Purpose](#purpose)
- [Contribute](#contribute)
- [Installation](#installation)
    - [From npm (Node/Bun)](#from-npm-nodebun)
- [Getting Started](#getting-started)
    - [import](#import)
<!-- - [Utilz](#utilz) -->
- [TODO](#todo)

## Purpose

## Contribute
Always open to ideas. Positive or negative, all are welcome. Feel free to contribute an [issue](https://github.com/JacobWeisenburger/freerstore/issues) or [PR](https://github.com/JacobWeisenburger/freerstore/pulls).

## Installation
[npmjs.com/package/freerstore](https://www.npmjs.com/package/freerstore)
```sh
npm install freerstore
yarn add freerstore
pnpm add freerstore
```

## Getting Started

### import
```ts
import { freerstore } from 'freerstore'
```

<!-- ## Utilz -->

<!-- ### SPR
SPR stands for SafeParseResult

This enables [optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) or [nullish coalescing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing) for `z.SafeParseReturnType`.

```ts
import { freerstore } from 'freerstore'
const schema = z.object( { foo: z.string() } )
const result = freerstore.SPR( schema.safeParse( { foo: 42 } ) )
const fooDataOrErrors = result.data?.foo ?? result.error?.format().foo?._errors
``` -->

## TODO
Always open to ideas. Positive or negative, all are welcome. Feel free to contribute an [issue](https://github.com/JacobWeisenburger/freerstore/issues) or [PR](https://github.com/JacobWeisenburger/freerstore/pulls).
- GitHub Actions
    - Auto publish to npm