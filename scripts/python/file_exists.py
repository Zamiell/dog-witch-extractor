#!/usr/bin/env python3
"""A simple bot to check if pages exist.

This bot will check if the given pages exist and print the result.

The following parameters are supported:

-always    The bot won't ask for confirmation

-summary:  Set the action summary message for the edit (not used in this version)

&params;
"""
#
# (C) Pywikibot team, 2006-2024
#
# Distributed under the terms of the MIT license.
#
from __future__ import annotations

import sys
import pywikibot
from pywikibot import pagegenerators
from pywikibot.bot import (
    ConfigParserBot,
    SingleSiteBot,
)


# This is required for the text that is shown when you run this script
# with the parameter -help.
docuReplacements = {'&params;': pagegenerators.parameterHelp}  # noqa: N816


class BasicBot(
    # Refer pywikobot.bot for generic bot classes
    SingleSiteBot,  # A bot only working on one site
    ConfigParserBot,  # A bot which reads options from scripts.ini setting file
):

    """A simple bot to check if pages exist.

    This bot processes pages and checks if they exist.
    """

    use_redirects = False  # treats non-redirects only

    update_options = {
        'summary': None,  # your own bot summary
    }

    def init_page(self, item):
        """Initialize a page object from a generator item."""
        # Override to suppress the "Retrieving X pages" message
        return super().init_page(item)

    def treat(self, page) -> None:
        """Check if the given page exists and print the result."""
        if page.exists():
            print('true')
        else:
            print('false')

    def teardown(self):
        """Cleanup after running."""
        # Override to suppress the execution statistics
        pass


def main(*args: str) -> None:
    """Process command line arguments and invoke bot.

    If args is an empty list, sys.argv is used.

    :param args: command line arguments
    """
    # Suppress pywikibot output
    pywikibot.config.verbose_output = False
    pywikibot.config.debug_log = []

    options = {}
    # Process global arguments to determine desired site
    local_args = pywikibot.handle_args(args)

    # This factory is responsible for processing command line arguments
    # that are also used by other scripts and that determine on which pages
    # to work on.
    gen_factory = pagegenerators.GeneratorFactory()

    # Process pagegenerators arguments
    local_args = gen_factory.handle_args(local_args)

    # Parse your own command line arguments
    for arg in local_args:
        arg, _, value = arg.partition(':')
        option = arg[1:]
        if option in ('summary',):
            if not value:
                pywikibot.input('Please enter a value for ' + arg)
            options[option] = value
        # take the remaining options as booleans.
        # You will get a hint if they aren't pre-defined in your bot class
        else:
            options[option] = True

    # The preloading option is responsible for downloading multiple
    # pages from the wiki simultaneously.
    gen = gen_factory.getCombinedGenerator(preload=True)

    # check if further help is needed
    if not pywikibot.bot.suggest_help(missing_generator=not gen):
        # Redirect stderr to suppress bot framework output
        old_stderr = sys.stderr
        sys.stderr = open('/dev/null', 'w') if sys.platform != 'win32' else open('nul', 'w')

        try:
            # pass generator and private options to the bot
            bot = BasicBot(generator=gen, **options)
            bot.run()  # guess what it does
        finally:
            # Restore stderr
            sys.stderr.close()
            sys.stderr = old_stderr


if __name__ == '__main__':
    main()
