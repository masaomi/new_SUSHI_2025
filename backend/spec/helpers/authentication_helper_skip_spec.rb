require 'rails_helper'

# Coverage for the single authentication choke point hardened for the fgcz-h-082
# production deployment (design v3, multi-LLM R2): authentication must FAIL CLOSED
# in production (no anonymous fallback -> no all-projects privilege escalation),
# regardless of which interactive login methods are enabled.
RSpec.describe AuthenticationHelper, '.authentication_skipped?' do
  before { allow(described_class).to receive(:enabled_auth_methods).and_return([]) }

  after do
    ENV.delete('SUSHI_REQUIRE_AUTH')
    ENV.delete('SUSHI_ALLOW_ANONYMOUS')
  end

  context 'in a non-production env with no auth methods enabled' do
    it 'skips auth (preserves headless dev/test behavior)' do
      expect(described_class.authentication_skipped?).to be true
    end
  end

  context 'when SUSHI_REQUIRE_AUTH=1' do
    it 'never skips auth, in any environment' do
      ENV['SUSHI_REQUIRE_AUTH'] = '1'
      expect(described_class.authentication_skipped?).to be false
    end
  end

  context 'in production' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
    end

    it 'fails CLOSED by default (authentication required even with no login methods)' do
      expect(described_class.authentication_skipped?).to be false
    end

    it 'permits anonymous ONLY with an explicit SUSHI_ALLOW_ANONYMOUS=1 opt-out' do
      ENV['SUSHI_ALLOW_ANONYMOUS'] = '1'
      expect(described_class.authentication_skipped?).to be true
    end
  end
end
