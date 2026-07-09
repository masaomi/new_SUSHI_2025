class ApplicationController < ActionController::Base
  include JwtAuthenticatable
  
  # Skip authentication if no auth methods are enabled
  if respond_to?(:authenticate_user!)
    skip_before_action :authenticate_user!, if: :skip_authentication?
  end
  skip_before_action :authenticate_jwt_token, if: :skip_authentication?
  
  # Add helper methods to views
  helper_method :authentication_skipped?
  
  private
  
  def skip_authentication?
    AuthenticationHelper.authentication_skipped?
  end
  
  def authentication_skipped?
    AuthenticationHelper.authentication_skipped?
  end
  
  # Override current_user when authentication is disabled
  def current_user
    # A bearer ApiToken authenticates as its own identity and takes precedence
    # over the skip-authentication default, so token scope is enforced even in
    # dev where auth is otherwise skipped. (api_token_identity is provided by
    # ApiTokenAuthenticatable; guarded so non-including controllers are safe.)
    if respond_to?(:token_authenticated?, true) && token_authenticated?
      return api_token_identity
    end

    if skip_authentication?
      # Return a default user
      AuthenticationHelper.get_default_user
    else
      @current_user || super
    end
  end
  
  # Override user_signed_in? when authentication is disabled
  def user_signed_in?
    if skip_authentication?
      true
    else
      current_user.present?
    end
  end
  
  # Override authenticate_user! when authentication is disabled
  def authenticate_user!
    if skip_authentication?
      # Do nothing - authentication is skipped
      return
    else
      # Skip if JWT authentication has already been executed
      return if @current_user.present?
      super
    end
  end
end
