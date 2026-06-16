_webpan_ is currently under development. Join the [webpan development channel (Matrix)](https://matrix.to/#/#webpan:siri.ws) for updates and support.

# Overview

_webpan_ is an extensible build tool that can be used for:
- Static site generation, such as creating wiki and blog sites.
- Publishing massive, loosely structured notes folders.
- Or any other user defined conversion tasks.

## Design philosophy

### Be extensible
There are a billion file formats out there, by default _webpan_ supports zero - it is up to the user to decide what they want.
### Be declarative
Options are done centrally through a central config file, so any new files created will look correct without tweaks.
### Be portable
A _webpan_ project is entriely self-contained, so it can be synced through Git and still look the same everywhere.

## Usage

Requires: **npm** and any text editor.

1. Create a new _webpan_ project.
    ```bash
    $ npm create wproject
    ```
    This creates a new folder at `my-wproject/`.
2. CD into the project folder, and install the project dependencies.
    ```bash
    $ npm install
    ```
3. Build the project, _webpan_ reads from the `src/` folder and writes output to the `dist/` folder.
    ```bash
    $ npm run build
    ```
4. View the files with a web browser. Or if you have **python** installed, start an http server with
    ```bash
    $ python -m http.server
    ```
    
## The _webpan_ universe

Your _webpan_ project is made of:
- [_webpan_](https://github.com/Siriusmart/webpan): the extensible build tool.
- [_create-wproject_](https://github.com/Siriusmart/create-wproject): the _webpan_ project template.
- _webpan packages_: they look at the `src/` folder and writes to the `dist/` folder. In `src/wrules.json`, you can see [_copy_](https://github.com/Siriusmart/wp-copy) and [_index_](https://github.com/Siriusmart/wp-index) being used in the template project.

  You can create your own package, or install existing packages with
  ```bash
  $ npm install wp-<package-name>
  ```

## Todo List

As the project is very new, these are the things I am working on:
- [ ] _wp-unified_ package which adds [_unified_](https://unifiedjs.com/) support. Which in turns support conversion between [a huge collection of file formats](https://unifiedjs.com/explore/project/).
- [ ] A [_vitepress_](https://vitepress.dev/) clone for writing docs (and then write the _webpan_ docs with it).
