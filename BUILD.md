## Building the CLI

This documentation is intended for developers and maintainers. To install BitCurator using a prebuild binary of this tool, follow the instructions at https://github.com/BitCurator/bitcurator-distro/wiki/Releases.

### Pre-requisites
- jo
- jq
- gpg
- git
- nodejs (v24, with npm - see instructions [here](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions))

```bash
$ sudo apt-get install jo jq gpg
```

```bash
# Follow the instructions at: https://nodejs.org/en/download (example here)
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"
# Download and install Node.js:
nvm install 24
# Verify the Node.js version:
node -v # Should print "v24.11.1".
# Verify npm version:
npm -v # Should print "11.6.2".
```

### Modifying
To customize the CLI, it's important to change the following spots in the CLI (as desired):
#### xxx-cli.js
- lines 35-50 (usage)
- lines 56-85 (PGP public key)
- `const getHelpText` (line 98)
- `const listReleases` (line 263 - important for pointing to the correct repo)
- `const downloadReleaseFile` (line 321, variable `req`)
- `const downloadRelease` (line 350, variable `req`)
- and anywhere else that might need to be customized for your release.

#### package.json
Important areas to modify:
- `name`
- `version`
- `scripts for pkg:prep/build/hash/nosign/sign` (important for signing release)
- `repository: url` (line 40)

#### package-lock.json
Important areas to modify:
- `name`
- `version`

### Building
Change to the CLI directory and run the following:
```bash
$ sudo npm install -g pkg docopt @octokit/rest js-yaml mkdirp openpgp semver split
$ npm install
```
To avoid having the node_modules folder, and the soon-to-be-created release folder, uploaded during a `git push`, create a `.gitignore` file and ensure these are added.

Now, update the version number in the `package-lock.json` file and the `package.json` file.

While still in the directory, run: `npm run pkg`

This will create the release folder with a `.sha256.asc` signature and the generated binary. Once your build is tested and you're satisfied with the way it turned out, it's time to release it.

### Release
First thing to do would be to add, commit, and push to the repo:
```bash
$ git add -A
$ git commit -m ''
$ git push origin
```
Once your push is complete, generate a tag:
`$ git tag vX.Y.Z` where `X.Y.Z` is your Major/Minor/Patch version number.

Push the tagged release:
`$ git push origin vX.Y.Z`

Go to the Tags section on GitHub, select your tag, and click `Create Release from Tag`
Name this release with the same version number as the tag, then browse to your release folder and upload both files (the binary, and the .sha256.asc file).
