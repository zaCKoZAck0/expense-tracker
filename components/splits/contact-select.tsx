"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contact } from "@/lib/types";

interface ContactSelectProps {
  contacts: Contact[];
  selectedContactIds: (string | null)[]; // null represents "You"
  onSelectionChange: (contactIds: (string | null)[]) => void;
  onAddContact: (name: string) => Promise<Contact>;
  disabled?: boolean;
  includeYou?: boolean; // Whether to show "You" as an option
}

/**
 * ContactSelect - Multi-select contact picker with inline contact creation
 * Supports selecting multiple contacts and adding new contacts on the fly
 */
export function ContactSelect({
  contacts,
  selectedContactIds,
  onSelectionChange,
  onAddContact,
  disabled = false,
  includeYou = true,
}: ContactSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [newContactName, setNewContactName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Get initials from name for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get color based on name for consistent avatar colors
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
      "bg-rose-500",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  // Toggle contact selection
  const toggleContact = (contactId: string | null) => {
    const newSelection = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter((id) => id !== contactId)
      : [...selectedContactIds, contactId];
    onSelectionChange(newSelection);
  };

  // Handle adding a new contact
  const handleAddNewContact = async () => {
    if (!newContactName.trim()) return;

    setIsLoading(true);
    try {
      const newContact = await onAddContact(newContactName.trim());
      // Auto-select the newly created contact
      onSelectionChange([...selectedContactIds, newContact.id]);
      setNewContactName("");
      setIsAddingNew(false);
      setSearchValue("");
    } catch (error) {
      console.error("Failed to add contact:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchValue.toLowerCase()),
  );

  // Check if search matches an existing contact
  const exactMatch = contacts.some(
    (contact) => contact.name.toLowerCase() === searchValue.toLowerCase(),
  );

  // Get selected contacts for display
  const selectedContacts = selectedContactIds
    .map((id) => {
      if (id === null) return { id: null, name: "You" };
      return contacts.find((c) => c.id === id);
    })
    .filter(Boolean) as (Contact | { id: null; name: string })[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-10 h-auto"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedContacts.length === 0 ? (
              <span className="text-muted-foreground">Select people...</span>
            ) : (
              selectedContacts.map((contact) => (
                <Badge
                  key={contact.id ?? "you"}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {contact.name}
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search contacts..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {!searchValue.trim() && <span>No contacts found.</span>}
            </CommandEmpty>

            {/* Quick add from search - show when typing a name that doesn't exist */}
            {!exactMatch && searchValue.trim() && (
              <CommandGroup>
                <CommandItem
                  value={`add-${searchValue}`}
                  onSelect={() => {
                    setNewContactName(searchValue);
                    setIsAddingNew(true);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add &quot;{searchValue}&quot;</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* "You" option */}
            {includeYou && (
              <CommandGroup heading="You">
                <CommandItem
                  value="you"
                  onSelect={() => toggleContact(null)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span>You</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedContactIds.includes(null)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              </CommandGroup>
            )}

            {/* Contacts list */}
            {filteredContacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {filteredContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.name}
                    onSelect={() => toggleContact(contact.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className={cn(
                            "text-white text-xs",
                            getAvatarColor(contact.name),
                          )}
                        >
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{contact.name}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedContactIds.includes(contact.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quick add contact */}
            <CommandSeparator />
            <CommandGroup>
              {!isAddingNew ? (
                <CommandItem
                  onSelect={() => setIsAddingNew(true)}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add new contact</span>
                </CommandItem>
              ) : (
                <div className="p-2 space-y-2">
                  <Label htmlFor="new-contact-name" className="text-xs">
                    New contact name
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-contact-name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Enter name"
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewContact();
                        }
                        if (e.key === "Escape") {
                          setIsAddingNew(false);
                          setNewContactName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={handleAddNewContact}
                      disabled={!newContactName.trim() || isLoading}
                    >
                      {isLoading ? "..." : "Add"}
                    </Button>
                  </div>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
