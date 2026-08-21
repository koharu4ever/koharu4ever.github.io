# Third-party notices

## Anki-tan reaction and sticker images

The complete set of fifty anime reaction and sticker images in
`source/img/reactions/anki-tan/` are
unmodified files from
[`Anki-tan Free Assets v1.0`](https://github.com/shigeyukey/shige-addons-wiki/releases/tag/Anki-tan)
by [Shigeyuki](https://www.patreon.com/Shigeyuki). The files have only been
renamed to describe their GitHub reaction, comment-frame or homepage use.

The upstream asset pack is licensed under the
[Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).
The project's license notes and attribution guidance are available on the
[official Anki-tan assets page](https://shigeyukey.github.io/shige-addons-wiki/Anki-tan.html#license).

Attribution: Shigeyuki — https://www.patreon.com/Shigeyuki

## Reimu image category cards

The `START HERE` image category navigation in this repository is adapted from
the home category card markup and styles in
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

## Authorship badge frame

The authorship badge frame in `source/img/badges/handmade-frame.svg` is a local
derivative assembled from these CC0 references:

- Kenney, [Medals 1.1](https://kenney.nl/assets/medals)
- Amousey,
  [Blue profile frame transparent.svg](https://commons.wikimedia.org/wiki/File:Blue_profile_frame_transparent.svg)

Both references are released under the Creative Commons CC0 1.0 Universal
Public Domain Dedication. The local derivative enlarges the portrait opening,
shortens and recolors the ribbons, combines the circular frame geometry, and
adds site-specific highlights and an empty label plate.

## Custom cursor assets

The three desktop cursor states in `source/img/cursor/` are copied without
modification from
[`qwqdhs/qwqdhs_blog`](https://github.com/qwqdhs/qwqdhs_blog), where they are
stored under `static/images/cursor/`.

That repository does not currently state a license for these customized image
files. Its cursor behavior is based on the Reimu theme's configurable
three-state cursor feature; the code license and image-asset rights are
separate.

## Tabler

The standalone Project Database interface uses
[`@tabler/core`](https://github.com/tabler/tabler) version `1.4.0`. Tabler's
compiled CSS is copied into the generated site during the Hexo build; the
regular Butterfly blog does not load it.

Tabler is distributed under the MIT License:

```text
MIT License

Copyright (c) 2018-2026 The Tabler Authors

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
