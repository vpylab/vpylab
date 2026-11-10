# VPyLab student guide

Open [VPyLab in English](https://vpylab.vercel.app/?lang=en), or choose **More → Language → English** (on a phone, **Menu → Language**). Your browser remembers the language. Switching languages keeps your current code and Forge draft.

## Where to start

- **Training**: start with the eight light and sound lessons. Predict a result, run the code, change one thing, and explain what happened. The four optional project lessons cover saving, GitHub, versions, and sharing.
- **Create**: write and run Python. Use **Run** and **Stop**, including when scheduled sounds continue after the Python body finishes.
- **Tutorials**: try a feature briefly, then explore a small project with a partner.
- **Forge**: shape one reusable object with sliders. Make a character, bell, star, heart, dome, cup, or ring.
- **Gallery**: explore actual student projects. The 33 supplied GlowScript originals include seven student projects and 26 teacher/reference projects; the latter list starts collapsed. Original project names, folders, credits, and code are preserved.
- **Docs**: look up VPython APIs, shape guides, and marked VPyLab extensions.
- **Guide**: read the full in-app instructions for individual and team work.

The English foundation lessons use `play_note_and_wait("C4", 0.4)`; the Korean alias `음표("도", 0.4)` remains supported. This helper waits for the note duration; `play_note()` starts the sound and continues immediately. Light and sound commands beyond VPython are marked as VPyLab extensions.

## Create and learn without AI

Completion uses the documentation and local rules. Type a function, argument, known property, color, variable, or function name. **Tab** accepts, **Esc** closes, and **Enter** adds a new line. You can also press **Complete** or Ctrl+Space. Suggestions avoid comments and strings; unknown object types may have fewer suggestions.

A small picture, meaning, and example appear beside the caret when you type a word such as `sphere`, `radius`, `opacity`, or `compound`. A word appears automatically at most twice per account in this browser. **Got it** hides future automatic help for that word. Typing, scrolling, Esc, or waiting briefly closes the card without moving focus. The manual dictionary under documentation and tutorial examples stays collapsed until opened. This help does not become a code comment. No runtime AI service receives your code for completion or word help.

## Friends and your own home

Drag sideways to turn the 3D friends; **Reset view** restores the view. Choose Dumpling, Flashlight, Toolbox, Pink friend, or Friends. The action button repeats the selected character's action; Stop returns it to its resting shape. Friends bounce at different times. Reduced motion disables automatic movement while allowing deliberate playback.

**Adjust lighting** starts collapsed. Open it and select either colored **Light 1** or **Light 2** card. Position and angle X/Y/Z, beam size, brightness, hue, and color are independent for each light. **Restore lighting** restores the character's palette. These sliders affect the default friends; change a featured project's lights in its code.

To feature your work, open it in Create and choose **Tools → Set current project as my home**. The home stores a code copy and preview. Change the welcome message and background, then explicitly run the project. Editing the home copy leaves the original project separate. Set it again to update the home. Restoring the default home keeps the copy; enable **Show this project on home** to display it again.

Home preferences, word-help history, and browser drafts belong to the current browser and account (guests have separate storage). They do not publish a project or synchronize to another device. Keep important original code in a saved project.

## Forge: one object, many projects

Choose one of four home characters (Dumpling, Flashlight, Toolbox, and Pink friend/Kirby), a bell, six project assets (crystal, coin, tree, rocket, chest, and goal flag), or five basic shapes. Previously saved characters stay available for editing and forking. Each new asset includes a project idea and a short line to try below the copied module code. Change proportions and colors, and rotate the preview. Characters become a single `compound`. Give the module a name and description, then add it to your browser library. Copy the finished module code into another project, or download the Python file. The factory function accepts position and scale.

```python
friend = make_your_module(pos=vector(0, 0, 0), scale=1)
friend.object.pos.x += 0.1
friend.object.opacity = 0.6
friend.object.color = vector(1, 0.7, 0.3)
```

The Kirby starter uses the same eyes, mouth, body, and limbs as the home Pink friend. Its preview uses the same stage lighting; the copied object excludes the stage. Previously edited or saved shapes stay intact. For an older draft, **Use the home character shape** updates the shape while keeping its title and credits. Undo restores it.

Use the actual function name in your copied code. A compound's color multiplies its original part colors: white parts take the new tint and black eyes remain black. Study the generated parts when you want to change one part separately. Sliders generate code in one direction; editing code does not update the sliders.

The bell progresses through **shape only → click sound → sound waves**. The rings visualize sound. Bell sound and helper commands are VPyLab extensions; other VPython environments may need adaptation. Exported standalone HTML supports a narrower extrusion subset.

In **Community modules**, a public object's code starts collapsed. Sign in and fork it to leave a private fork record in your account, then modify it in the workbench. Republishing retains the original title, author, and added reference links. You can add up to eight references and unpublish your own module later. Public module code can be accessed and reused; a collapsed code panel is not a privacy control. Browser drafts and account records are separate.

The character tutorial combines parts, moves the compound, and changes only the controlled character's tint when it collects an item. Try arrow keys, WASD, or the on-screen buttons. Partners can develop body, face, movement, and sound, then read and combine their code.

## Save as video

**Tools → Save as video** in Create records the 3D view and sound together, for a presentation or a submission. Recording stops by itself at 30 seconds, or when you press **Finish recording**. The video file is then downloaded to this computer. Recording happens in your browser and the video is not sent to a server. Leaving Create while recording cancels it. On a shared computer, move the file somewhere safe before the lesson ends.

## Keeping your practice record

When you are signed in, the missions you pass in Training are also saved to your account. Sign in with the same account on another computer and they show as passed again. If a mission has a record in both places, the higher score is shown. Missions you pass without signing in stay in that browser and move to your account when you sign in later. Signing out clears the record from that computer; signing in brings it back. On a shared computer, sign out when you finish so the next person does not see your record. Only passed missions are restored. Code you are still writing is kept only when you press Save.

## Saving and working together

Create or join a team project from Create. Save a clearly named version and describe why you changed it. Compare the latest shared version before replacing someone else's work. Use the version history to inspect or restore a previous snapshot. GitHub connection is optional and creates a public repository; code and saved change notes may be public. Verify the repository or running link after saving or publishing.

Stop ends audio, queued sounds, and runtime events; leaving an execution screen also releases them. Normal Python completion may leave event handlers or scheduled audio active, so use Stop when finished.
