#!/usr/bin/env python3
"""A bot to download media files from File: pages.

This bot will check if the given File: pages exist and download the actual media files.

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

import os
import re
import tempfile
import requests
import pywikibot
from pywikibot import pagegenerators
from pywikibot.bot import (
    ConfigParserBot,
    SingleSiteBot,
)
from pywikibot.page import FilePage
from dotenv import load_dotenv

load_dotenv()

# This is required for the text that is shown when you run this script
# with the parameter -help.
docuReplacements = {'&params;': pagegenerators.parameterHelp}  # noqa: N816


class BasicBot(
    # Refer pywikobot.bot for generic bot classes
    SingleSiteBot,  # A bot only working on one site
    ConfigParserBot,  # A bot which reads options from scripts.ini setting file
):

    """A bot to download media files from File: pages.

    This bot processes File: pages and downloads the actual media files if they exist.
    """

    use_redirects = False  # treats non-redirects only

    update_options = {
        'summary': None,  # your own bot summary
    }

    def setup(self):
        """Set up the bot."""
        super().setup()

        # Use system temp directory
        self.output_dir = tempfile.gettempdir()
        pywikibot.output(f'Using temp directory: {self.output_dir}')

    def treat(self, page) -> None:
        """Download the media file if it's a File: page and exists."""
        title = page.title()

        # Check if this is a File: page
        if page.namespace() != 6:  # 6 is the File namespace
            pywikibot.output(f'Skipping "{title}" - not a File: page')
            return

        if not page.exists():
            pywikibot.output(f'File page "{title}" does NOT exist. Skipping.')
            return

        # Convert to FilePage to access file-specific methods
        file_page = FilePage(page)

        pywikibot.output(f'File page "{title}" exists. Downloading media file...')

        try:
            # Get the direct URL to the media file
            file_url = file_page.get_file_url()

            # Get the original filename
            filename = file_page.title(with_ns=False)

            # Create a safe filename
            safe_filename = re.sub(r'[<>:"/\\|?*]', '_', filename)

            filepath = os.path.join(self.output_dir, safe_filename)

            # Check if file already exists
            if os.path.exists(filepath):
                pywikibot.output(f'  - File already exists: {filepath}')
                os.unlink(filepath)
                pywikibot.output(f'  - Deleted: {filepath}')

            # Download the file
            pywikibot.output(f'  - Downloading from: {file_url}')

            # Get HTTP authentication credentials from environment variables
            http_username = os.environ.get('HTTP_USERNAME')
            http_password = os.environ.get('HTTP_PASSWORD')

            if http_username and http_password:
                pywikibot.output(f'  - Using HTTP authentication for user: {http_username}')
                response = requests.get(file_url, stream=True, auth=(http_username, http_password))
            else:
                response = requests.get(file_url, stream=True)

            response.raise_for_status()

            # Write the file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            # Get file size
            file_size = os.path.getsize(filepath)

            pywikibot.output(f'  - Saved to: {filepath}')
            pywikibot.output(f'  - Size: {file_size:,} bytes')

        except requests.RequestException as e:
            pywikibot.error(f'Failed to download file for "{title}": {e}')
        except Exception as e:
            pywikibot.error(f'Error processing "{title}": {e}')


def main(*args: str) -> None:
    """Process command line arguments and invoke bot.

    If args is an empty list, sys.argv is used.

    :param args: command line arguments
    """
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
        # pass generator and private options to the bot
        bot = BasicBot(generator=gen, **options)
        bot.run()  # guess what it does


if __name__ == '__main__':
    main()
