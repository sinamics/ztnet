#!/bin/bash

# Define the translations for each language
declare -A translations

# English (already done)

# Spanish
translations["es"]='				"deleteGroupWithUsersWarning": "Advertencia: Este grupo tiene {count} {userText} asignados.",
				"deleteGroupWithUsersDescription": "Eliminar este grupo automáticamente quitará todos los usuarios del grupo. Los usuarios en sí no serán eliminados, pero ya no pertenecerán a ningún grupo.",
				"deleteGroupConfirmation": "Esta acción no se puede deshacer. ¿Estás seguro de que quieres continuar?",'

# French  
translations["fr"]='				"deleteGroupWithUsersWarning": "Attention : Ce groupe a {count} {userText} assigné(s).",
				"deleteGroupWithUsersDescription": "Supprimer ce groupe supprimera automatiquement tous les utilisateurs du groupe. Les utilisateurs eux-mêmes ne seront pas supprimés, mais ils n'\''appartiendront plus à aucun groupe.",
				"deleteGroupConfirmation": "Cette action ne peut pas être annulée. Êtes-vous sûr de vouloir continuer ?",'

# Russian
translations["ru"]='				"deleteGroupWithUsersWarning": "Предупреждение: В этой группе {count} {userText}.",
				"deleteGroupWithUsersDescription": "Удаление этой группы автоматически удалит всех пользователей из группы. Сами пользователи не будут удалены, но они больше не будут принадлежать к какой-либо группе.",
				"deleteGroupConfirmation": "Это действие нельзя отменить. Вы уверены, что хотите продолжить?",'

# Chinese Simplified  
translations["zh"]='				"deleteGroupWithUsersWarning": "警告：此组有 {count} 个{userText}。",
				"deleteGroupWithUsersDescription": "删除此组将自动从组中删除所有用户。用户本身不会被删除，但他们将不再属于任何组。",
				"deleteGroupConfirmation": "此操作无法撤消。您确定要继续吗？",'

# Chinese Traditional
translations["zh-tw"]='				"deleteGroupWithUsersWarning": "警告：此組有 {count} 個{userText}。",
				"deleteGroupWithUsersDescription": "刪除此組將自動從組中刪除所有用戶。用戶本身不會被刪除，但他們將不再屬於任何組。",
				"deleteGroupConfirmation": "此操作無法撤銷。您確定要繼續嗎？",'

# Norwegian
translations["no"]='				"deleteGroupWithUsersWarning": "Advarsel: Denne gruppen har {count} {userText}.",
				"deleteGroupWithUsersDescription": "Sletting av denne gruppen vil automatisk fjerne alle brukere fra gruppen. Brukerne selv vil ikke bli slettet, men de vil ikke lenger tilhøre noen gruppe.",
				"deleteGroupConfirmation": "Denne handlingen kan ikke angres. Er du sikker på at du vil fortsette?",'

# Polish
translations["pl"]='				"deleteGroupWithUsersWarning": "Ostrzeżenie: Ta grupa ma {count} {userText}.",
				"deleteGroupWithUsersDescription": "Usunięcie tej grupy automatycznie usunie wszystkich użytkowników z grupy. Sami użytkownicy nie zostaną usunięci, ale nie będą już należeć do żadnej grupy.",
				"deleteGroupConfirmation": "Tej akcji nie można cofnąć. Czy jesteś pewien, że chcesz kontynuować?",'

# Add translations to each language file
for lang in es fr ru zh zh-tw no pl; do
    file="src/locales/$lang/common.json"
    echo "Processing $file..."
    
    # Find the line with deleteGroupDescription and add our translations after it
    sed -i "/\"deleteGroupDescription\":/a\\
${translations[$lang]}" "$file"
done

echo "Translations added successfully!"
