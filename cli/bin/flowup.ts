#!/usr/bin/env node
/**
 * flowup bin 入口 —— 只做一件事:装配所有子命令,parse argv。
 *
 * 每个子命令的 register 函数从 commands/<name>/command 拿;
 * 子命令内部怎么做 (impl 在哪、模板怎么渲染、产物怎么写) 跟 bin 无关。
 */

import process from 'node:process'
import { Command } from 'commander'
import { registerBuildCommand } from '../src/commands/build/command.js'
import { registerBundleCommand } from '../src/commands/bundle/command.js'
import { registerDevCommand } from '../src/commands/dev/command.js'
import { registerGenCommand } from '../src/commands/gen/command.js'
import { resolveCliVersion } from '../src/share/cli-pkg'

const program = new Command()

program
  .name('flowup')
  .description('CLI tool for building, generating, and bundling Node-RED custom nodes.')
  .version(resolveCliVersion())

registerBuildCommand(program)
registerDevCommand(program)
registerGenCommand(program)
registerBundleCommand(program)

program.parse(process.argv)
