#!/usr/bin/env ruby
# encoding: utf-8
# Fixture mimicking a legacy SUSHI app: it `require`s the legacy gem and global
# vars and does a top-level include — exactly the lines LegacyAppLoader neutralizes
# so the class binds to the backend headless shim instead of the legacy gem.
require 'sushi_fabric'
require_relative 'global_variables'
include GlobalVariables

class FooBarApp < SushiFabric::SushiApp
  def initialize
    super
    @name = 'FooBar'
    @params['process_mode'] = 'DATASET'
    @analysis_category = 'Test'
    @description = 'Fixture legacy app for LegacyAppLoader specs'
    @required_columns = ['Name']
    @params['cores'] = 1
    @params['partition'] = '' # deliberately empty; no super in set_default_parameters
  end

  # Overrides WITHOUT calling super — exercises the centralized base-default path.
  def set_default_parameters
    @params['cores'] = 1
  end

  def next_dataset
    { 'Name' => 'foobar_out' }
  end
end
