# Methods added to this helper will be available to all templates in the application.
module ApplicationHelper
end

#module WillPaginate
#  module Helpers
#    module PaginationHelper
#      def pagination_links_remote(paginator, page_options={}, ajax_options={}, html_options={})
#        name = page_options[:name] || DEFAULT_OPTIONS[:name]
#        params = (page_options[:params] || DEFAULT_OPTIONS[:params]).clone
#
#        pagination_links_each(paginator, page_options) do |n|
#          params[name] = n
#          ajax_options[:url] = params
#          link_to_remote(n.to_s, ajax_options, html_options)
#        end
#      end
#    end # PaginationHelper
#  end # Helpers
#end # ActionView

