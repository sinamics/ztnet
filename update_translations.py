#!/usr/bin/env python3
import json
import sys

# Define translations for each language
translations = {
    "fr": {
        "deleteGroupWithUsersWarning": "Attention : Ce groupe a {count} {userText} assigné(s).",
        "deleteGroupWithUsersDescription": "Supprimer ce groupe supprimera automatiquement tous les utilisateurs du groupe. Les utilisateurs eux-mêmes ne seront pas supprimés, mais ils n'appartiendront plus à aucun groupe.",
        "deleteGroupConfirmation": "Cette action ne peut pas être annulée. Êtes-vous sûr de vouloir continuer ?"
    },
    "ru": {
        "deleteGroupWithUsersWarning": "Предупреждение: В этой группе {count} {userText}.",
        "deleteGroupWithUsersDescription": "Удаление этой группы автоматически удалит всех пользователей из группы. Сами пользователи не будут удалены, но они больше не будут принадлежать к какой-либо группе.",
        "deleteGroupConfirmation": "Это действие нельзя отменить. Вы уверены, что хотите продолжить?"
    },
    "zh": {
        "deleteGroupWithUsersWarning": "警告：此组有 {count} 个{userText}。",
        "deleteGroupWithUsersDescription": "删除此组将自动从组中删除所有用户。用户本身不会被删除，但他们将不再属于任何组。",
        "deleteGroupConfirmation": "此操作无法撤消。您确定要继续吗？"
    },
    "zh-tw": {
        "deleteGroupWithUsersWarning": "警告：此組有 {count} 個{userText}。",
        "deleteGroupWithUsersDescription": "刪除此組將自動從組中刪除所有用戶。用戶本身不會被刪除，但他們將不再屬於任何組。",
        "deleteGroupConfirmation": "此操作無法撤銷。您確定要繼續嗎？"
    },
    "no": {
        "deleteGroupWithUsersWarning": "Advarsel: Denne gruppen har {count} {userText}.",
        "deleteGroupWithUsersDescription": "Sletting av denne gruppen vil automatisk fjerne alle brukere fra gruppen. Brukerne selv vil ikke bli slettet, men de vil ikke lenger tilhøre noen gruppe.",
        "deleteGroupConfirmation": "Denne handlingen kan ikke angres. Er du sikker på at du vil fortsette?"
    },
    "pl": {
        "deleteGroupWithUsersWarning": "Ostrzeżenie: Ta grupa ma {count} {userText}.",
        "deleteGroupWithUsersDescription": "Usunięcie tej grupy automatycznie usunie wszystkich użytkowników z grupy. Sami użytkownicy nie zostaną usunięci, ale nie będą już należeć do żadnej grupy.",
        "deleteGroupConfirmation": "Tej akcji nie można cofnąć. Czy jesteś pewien, że chcesz kontynuować?"
    }
}

def add_translations_to_file(lang_code, translations_dict):
    file_path = f"src/locales/{lang_code}/common.json"
    
    try:
        # Read the JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Navigate to the correct location in the JSON structure
        add_group = data['admin']['users']['groups']['addGroup']
        
        # Add new translations after deleteGroupDescription
        keys = list(add_group.keys())
        desc_index = keys.index('deleteGroupDescription')
        
        # Create new dictionary with items in correct order
        new_add_group = {}
        for i, key in enumerate(keys):
            new_add_group[key] = add_group[key]
            if i == desc_index:  # After deleteGroupDescription
                for trans_key, trans_value in translations_dict.items():
                    new_add_group[trans_key] = trans_value
        
        # Update the data
        data['admin']['users']['groups']['addGroup'] = new_add_group
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent='\t')
        
        print(f"Successfully updated {file_path}")
        
    except Exception as e:
        print(f"Error updating {file_path}: {e}")

# Process each language
for lang, trans in translations.items():
    add_translations_to_file(lang, trans)

print("All translations updated!")
