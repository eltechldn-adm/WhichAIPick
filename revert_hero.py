import os
import re

def revert_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Pattern to match:
        # <section class="hero-shell">
        #     <div class="hero-surface">
        #         <div class="hero-inner">
        #             ... content ...
        #         </div>
        #     </div>
        # </section>
        
        # We need to be careful with whitespace and newlines.
        # Let's try to find the start and end markers.
        
        start_marker = '<section class="hero-shell">'
        surface_start = '<div class="hero-surface">'
        inner_start = '<div class="hero-inner">'
        
        if start_marker not in content or surface_start not in content:
            # print(f"Skipping {filepath}: Pattern not found")
            return

        # Simple string replacement for the opening tags
        # We want to remove the surface and inner divs
        # The structure is: hero-shell -> hero-surface -> hero-inner -> CONTENT
        
        # New structure: hero-shell -> CONTENT
        
        # Regex might be safer to capture the exact indentation structure I created
        # My previous script did:
        # '\n    <div class="hero-surface">\n        <div class="hero-inner">' 
        
        # So I should look for that exact string
        
        pattern_start = r'<section class="hero-shell">\s*<div class="hero-surface">\s*<div class="hero-inner">'
        pattern_end = r'\s*</div>\s*</div>\s*</section>'
        
        # Check if file matches the specific structure I added
        if re.search(pattern_start, content) and re.search(pattern_end, content):
            # Replace start
            new_content = re.sub(pattern_start, '<section class="hero-shell">', content)
            
            # Replace end (finding the *first* occurrence after the start is tricky with global replace)
            # But wait, my script added them wrapping the *entire* inner content of that section.
            # So the closing tags are at the very end of the section.
            
            # Let's use a robust approach: match the whole block? No, content is too large.
            
            # Let's just remove the specific lines I added.
            # I added:
            # <div class="hero-surface">
            #     <div class="hero-inner">
            # AND
            #     </div>
            # </div>
            
            # So I can just remove those strings.
            new_content = new_content.replace('<div class="hero-surface">', '')
            new_content = new_content.replace('<div class="hero-inner">', '')
            
            # And the closing divs. The closing divs are just </div></div>.
            # This is dangerous because it might remove other closing divs.
            # But I know I wrapped the *content* of the section.
            # So the section ends with </div></div></section>.
            
            new_content = new_content.replace('</div>\n    </div>\n</section>', '</section>')
            # Also cover potential whitespace variations if my previous script was slightly different
            new_content = new_content.replace('        </div>\n    </div>\n        </section>', '</section>')
            # My previous script used:
            # '\n        </div>\n    </div>' + content[end_idx:] (where content[end_idx:] starts with </section>)
            # So it looks like:
            # ... content ...
            #         </div>
            #     </div></section>
            
            new_content = new_content.replace('        </div>\n    </div></section>', '</section>')
            
            # Let's clean up extra whitespace/indentation if possible, but browsers don't care.
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Reverted {filepath}")
        else:
            print(f"Skipping {filepath}: Regex mismatch")

    except Exception as e:
        print(f"Failed to revert {filepath}: {e}")

# List of directories to scan
dirs = ['.', 'academy', 'use-cases', 'compare', 'blog', 'make-money', 'tools']
base_path = '/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick'

for d in dirs:
    dir_path = os.path.join(base_path, d)
    if not os.path.exists(dir_path):
        continue
        
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.html'):
                 revert_file(os.path.join(root, file))
