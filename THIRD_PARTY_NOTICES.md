# Third-party notices

## Reimu image category cards

The `START HERE` image category navigation and the project visual treatment in
this repository are adapted from the home category card markup and styles in
[`D-Sketon/hexo-theme-reimu`](https://github.com/D-Sketon/hexo-theme-reimu),
commit `732e0cc802a51ac22c227928ab04270dfc8587f0`:

- `layout/_partial/archive.ejs`
- `source/css/_partial/post.styl`

The upstream project is distributed under the MIT License:

```text
MIT License

Copyright (c) 2023 D-Sketon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Hextra Steps

The reading path structure in `source/projects/index.md` and its scoped styles
in `source/css/custom.css` are adapted from the Steps shortcode in
[`imfing/hextra`](https://github.com/imfing/hextra), commit
`3551a56b8cdebd38170ecb5990e17ec9130aa457`:

- `layouts/_shortcodes/steps.html`
- `assets/css/components/steps.css`

Only the semantic step structure, left rail and numbered marker treatment are
used. Hugo, Tailwind and the Hextra theme are not included as dependencies.

The upstream project is distributed under the MIT License:

```text
MIT License

Copyright (c) 2023 Xin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Vercel / Next.js Image Gallery example

The CSS-columns gallery geometry used by the `/notes/` page is adapted from
the image gallery example in
[`vercel/next.js`](https://github.com/vercel/next.js), `canary` branch, source
file `examples/with-vercel-blob/pages/index.tsx` (blob
`aeeeb62d239276ffef50bcd7f0d0b91a7347156a`). Kita's existing Games gallery
was used as the immediate project-local reference.

Only the columns geometry, responsive breakpoints, `break-inside` behavior
and restrained image hover treatment are used. The Next.js, Tailwind, Vercel
Blob and modal implementations are not included, and no upstream image asset
is copied.

The upstream Next.js repository is distributed under the MIT License:

```text
MIT License

Copyright (c) 2025 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
