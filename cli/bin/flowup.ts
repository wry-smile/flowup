#!/usr/bin/env node

import process from 'node:process'
import { Command } from 'commander'
import { registerBuildCommand } from '../src/commands/build/command'
import { registerGenCommand } from '../src/commands/gen/command'
import { resolveCliVersion } from '../src/share/cli-pkg'

const program = new Command()

program
  .name('flowup')
  .description('CLI tool for scaffolding Node-RED custom nodes and plugins.')
  .version(resolveCliVersion())

registerBuildCommand(program)
registerGenCommand(program)

program.parse(process.argv)
