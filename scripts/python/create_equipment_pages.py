#!/usr/bin/env python3
"""A bot to create wiki pages from JSON data.

This bot reads a JSON file containing equipment data and creates
wiki pages for each entry with the appropriate infobox template.
"""

import json
import pywikibot
from pywikibot.bot import (
    ConfigParserBot,
    SingleSiteBot,
)


class EquipmentPageBot(SingleSiteBot, ConfigParserBot):
    """A bot to create wiki pages from JSON equipment data."""

    use_redirects = False

    update_options = {
        'summary': 'Creating equipment page from JSON data',
        'always': False,
    }

    def __init__(self, json_file, **kwargs):
        """Initialize the bot with JSON data.

        :param json_file: Path to the JSON file containing equipment data
        """
        super().__init__(**kwargs)
        self.json_file = json_file
        self.equipment_data = []

    def run(self):
        """Load JSON and process each equipment entry."""
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.equipment_data = json.load(f)
            pywikibot.output(f'Loaded {len(self.equipment_data)} equipment entries')
        except FileNotFoundError:
            pywikibot.error(f'File not found: {self.json_file}')
            return
        except json.JSONDecodeError as e:
            pywikibot.error(f'Invalid JSON: {e}')
            return

        # Process each equipment entry
        for equipment in self.equipment_data:
            if 'name' not in equipment:
                pywikibot.warning(f'Skipping entry without name: {equipment}')
                continue

            page_title = equipment['name']
            page = pywikibot.Page(self.site, page_title)

            # Create the page content
            page_content = "{{equipment infobox}}"

            # Check if page already exists
            if page.exists():
                pywikibot.output(f'Page "{page_title}" already exists, skipping...')
                continue

            # Create the page
            try:
                if self.opt.always or pywikibot.input_yn(
                    f'Create page "{page_title}"?',
                    default=False,
                    automatic_quit=False
                ):
                    page.text = page_content
                    page.save(summary=self.opt.summary)
                    pywikibot.output(f'Created page: {page_title}')
            except Exception as e:
                pywikibot.error(f'Failed to create page "{page_title}": {e}')


def main(*args: str) -> None:
    """Process command line arguments and invoke bot.

    :param args: command line arguments
    """
    options = {}
    json_file = None

    # Process arguments
    local_args = pywikibot.handle_args(args)

    for arg in local_args:
        if arg.startswith('-summary:'):
            options['summary'] = arg.partition(':')[2]
        elif arg == '-always':
            options['always'] = True
        elif not arg.startswith('-'):
            # Assume it's the JSON file path
            json_file = arg

    if not json_file:
        pywikibot.error('Please provide a JSON file path')
        pywikibot.output('Usage: python script.py [options] <json_file>')
        pywikibot.output('Options:')
        pywikibot.output('  -always    Create pages without confirmation')
        pywikibot.output('  -summary:  Set the edit summary')
        return

    # Create and run the bot
    bot = EquipmentPageBot(json_file, **options)
    bot.run()


if __name__ == '__main__':
    main()
