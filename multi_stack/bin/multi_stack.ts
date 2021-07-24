#!/usr/bin/env node
import 'source-map-support/register';
import { RootStack } from '../lib/multi_stack-stack';
import { App } from 'aws-cdk-lib';

new RootStack(new App());
