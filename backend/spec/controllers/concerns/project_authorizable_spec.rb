require 'rails_helper'

RSpec.describe ProjectAuthorizable do
  # Minimal host that includes the concern. FGCZ is now loaded app-wide, so we
  # stub the resolver to be unavailable (raises) to exercise the subject of these
  # tests: projects_when_resolution_unavailable (prod fail-closed vs dev fallback).
  let(:host_class) do
    Class.new do
      include ProjectAuthorizable
      attr_reader :current_user
      def initialize(user)
        @current_user = user
      end
    end
  end
  let(:user) { create(:user, login: 'alice') }
  subject(:host) { host_class.new(user) }

  before do
    create(:project, number: 1001)
    create(:project, number: 1002)
    allow(FGCZ).to receive(:get_user_projects2).and_raise(StandardError, 'resolver down')
  end

  context 'in production when project resolution is unavailable' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
      allow(AuthenticationHelper).to receive(:authentication_skipped?).and_return(false)
    end

    it 'fails closed and grants no projects' do
      expect(host.send(:current_user_project_numbers)).to eq([])
    end
  end

  context 'in non-production environments' do
    it 'falls back to all projects for dev convenience' do
      expect(host.send(:current_user_project_numbers)).to match_array(%w[1001 1002])
    end
  end
end
