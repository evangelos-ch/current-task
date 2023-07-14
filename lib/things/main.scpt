on run argv
	tell application "Things3"
		using terms from application "Things3"
			repeat with toDo in to dos
				if tag names of toDo contains (item 1 of argv as string) then
					return name of toDo as string
				end if
			end repeat
		end using terms from
	end tell
end run