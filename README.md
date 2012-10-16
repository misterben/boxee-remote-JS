boxee-remote-JS
===============

A generic javascript library for interacting with the boxee system, including advanced bookmarking

This was initially designed as a simple javascript library that could then be hooked into a SpotSpecific application. Hence it requires the CORE_store and CORE_engine.xhr libraries to handle the use of HTML5 localStorage and proxied XHR requests, it has since been ported to a "vanilla" JS application, although still requires circumvention of the XHR sandbox, so is best run from a file: URL.

Storage is now handled by Brian Leroux's rather brilliant Lawnchair.

