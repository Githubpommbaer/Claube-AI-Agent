(function () {
    'use strict';

    const STORAGE_KEY = 'sharetodo_lists';

    // --- State ---
    let lists = loadLists();
    let currentListId = null;

    // --- DOM Elements ---
    const $ = (sel) => document.querySelector(sel);
    const listDetailSection = $('#list-detail');
    const listsOverviewSection = $('#lists-overview');
    const listsContainer = $('#lists-container');
    const emptyState = $('#empty-state');
    const todosListEl = $('#todos-list');
    const todosEmpty = $('#todos-empty');
    const progressFill = $('#progress-fill');
    const progressText = $('#progress-text');
    const listTitle = $('#list-title');
    const shareModal = $('#share-modal');
    const shareLink = $('#share-link');
    const copyFeedback = $('#copy-feedback');
    const importBanner = $('#import-banner');
    const newListInput = $('#new-list-name');
    const newTodoInput = $('#new-todo-text');

    // --- Persistence ---
    function loadLists() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveLists() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    }

    // --- ID generation ---
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    // --- Sharing (URL encode/decode) ---
    function encodeListForSharing(list) {
        const data = {
            name: list.name,
            todos: list.todos.map(function (t) {
                return { text: t.text, done: t.done };
            })
        };
        return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    }

    function decodeSharedList(encoded) {
        try {
            var json = decodeURIComponent(escape(atob(encoded)));
            var data = JSON.parse(json);
            if (!data.name || !Array.isArray(data.todos)) return null;
            return data;
        } catch {
            return null;
        }
    }

    function getShareUrl(list) {
        var base = window.location.href.split('?')[0].split('#')[0];
        return base + '?share=' + encodeListForSharing(list);
    }

    // --- Rendering: Lists Overview ---
    function renderListsOverview() {
        listsContainer.innerHTML = '';

        if (lists.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        lists.forEach(function (list) {
            var total = list.todos.length;
            var done = list.todos.filter(function (t) { return t.done; }).length;

            var card = document.createElement('div');
            card.className = 'list-card';
            card.setAttribute('data-id', list.id);
            card.innerHTML =
                '<div class="list-card-info">' +
                    '<h3>' + escapeHtml(list.name) + '</h3>' +
                    '<p>' + done + '/' + total + ' erledigt</p>' +
                '</div>' +
                '<span class="list-card-arrow">&rsaquo;</span>';

            card.addEventListener('click', function () {
                openList(list.id);
            });

            listsContainer.appendChild(card);
        });
    }

    // --- Rendering: List Detail ---
    function renderListDetail() {
        var list = lists.find(function (l) { return l.id === currentListId; });
        if (!list) return;

        listTitle.textContent = list.name;
        todosListEl.innerHTML = '';

        if (list.todos.length === 0) {
            todosEmpty.classList.remove('hidden');
            progressFill.style.width = '0%';
            progressText.textContent = '0/0 erledigt';
            return;
        }

        todosEmpty.classList.add('hidden');

        var total = list.todos.length;
        var done = 0;

        list.todos.forEach(function (todo, index) {
            if (todo.done) done++;

            var li = document.createElement('li');
            li.className = 'todo-item' + (todo.done ? ' completed' : '');

            var checkbox = document.createElement('button');
            checkbox.className = 'todo-checkbox';
            checkbox.textContent = todo.done ? '\u2713' : '';
            checkbox.addEventListener('click', function () {
                toggleTodo(index);
            });

            var text = document.createElement('span');
            text.className = 'todo-text';
            text.textContent = todo.text;

            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'todo-delete';
            deleteBtn.textContent = '\u00d7';
            deleteBtn.title = 'Entfernen';
            deleteBtn.addEventListener('click', function () {
                deleteTodo(index);
            });

            li.appendChild(checkbox);
            li.appendChild(text);
            li.appendChild(deleteBtn);
            todosListEl.appendChild(li);
        });

        var percent = total > 0 ? Math.round((done / total) * 100) : 0;
        progressFill.style.width = percent + '%';
        progressText.textContent = done + '/' + total + ' erledigt';
    }

    // --- Navigation ---
    function showOverview() {
        currentListId = null;
        listDetailSection.classList.add('hidden');
        listsOverviewSection.classList.remove('hidden');
        shareModal.classList.add('hidden');
        renderListsOverview();
    }

    function openList(id) {
        currentListId = id;
        listsOverviewSection.classList.add('hidden');
        listDetailSection.classList.remove('hidden');
        shareModal.classList.add('hidden');
        renderListDetail();
        newTodoInput.value = '';
        newTodoInput.focus();
    }

    // --- Actions ---
    function createList(name) {
        name = name.trim();
        if (!name) return;

        var list = {
            id: generateId(),
            name: name,
            todos: [],
            createdAt: new Date().toISOString()
        };

        lists.unshift(list);
        saveLists();
        renderListsOverview();
        newListInput.value = '';
        openList(list.id);
    }

    function deleteList() {
        if (!currentListId) return;
        var list = lists.find(function (l) { return l.id === currentListId; });
        if (!list) return;
        if (!confirm('Liste "' + list.name + '" wirklich löschen?')) return;

        lists = lists.filter(function (l) { return l.id !== currentListId; });
        saveLists();
        showOverview();
    }

    function addTodo(text) {
        text = text.trim();
        if (!text || !currentListId) return;

        var list = lists.find(function (l) { return l.id === currentListId; });
        if (!list) return;

        list.todos.push({ text: text, done: false });
        saveLists();
        renderListDetail();
        newTodoInput.value = '';
        newTodoInput.focus();
    }

    function toggleTodo(index) {
        var list = lists.find(function (l) { return l.id === currentListId; });
        if (!list || !list.todos[index]) return;

        list.todos[index].done = !list.todos[index].done;
        saveLists();
        renderListDetail();
    }

    function deleteTodo(index) {
        var list = lists.find(function (l) { return l.id === currentListId; });
        if (!list) return;

        list.todos.splice(index, 1);
        saveLists();
        renderListDetail();
    }

    function shareList() {
        var list = lists.find(function (l) { return l.id === currentListId; });
        if (!list) return;

        shareLink.value = getShareUrl(list);
        shareModal.classList.toggle('hidden');
        copyFeedback.classList.add('hidden');
    }

    function copyShareLink() {
        shareLink.select();
        navigator.clipboard.writeText(shareLink.value).then(function () {
            copyFeedback.classList.remove('hidden');
            setTimeout(function () {
                copyFeedback.classList.add('hidden');
            }, 2000);
        }).catch(function () {
            document.execCommand('copy');
            copyFeedback.classList.remove('hidden');
        });
    }

    function importSharedList(data) {
        var list = {
            id: generateId(),
            name: data.name,
            todos: data.todos.map(function (t) {
                return { text: t.text, done: !!t.done };
            }),
            createdAt: new Date().toISOString()
        };

        lists.unshift(list);
        saveLists();

        // Clear URL
        window.history.replaceState(null, '', window.location.pathname);

        importBanner.classList.add('hidden');
        renderListsOverview();
        openList(list.id);
    }

    // --- Helpers ---
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Event Listeners ---
    $('#btn-create-list').addEventListener('click', function () {
        createList(newListInput.value);
    });

    newListInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') createList(newListInput.value);
    });

    $('#btn-back').addEventListener('click', showOverview);

    $('#btn-delete-list').addEventListener('click', deleteList);

    $('#btn-share').addEventListener('click', shareList);

    $('#btn-copy').addEventListener('click', copyShareLink);

    $('#btn-add-todo').addEventListener('click', function () {
        addTodo(newTodoInput.value);
    });

    newTodoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') addTodo(newTodoInput.value);
    });

    // --- Check for shared list in URL ---
    function checkForSharedList() {
        var params = new URLSearchParams(window.location.search);
        var shareData = params.get('share');
        if (!shareData) return;

        var data = decodeSharedList(shareData);
        if (!data) return;

        importBanner.classList.remove('hidden');

        $('#btn-import').addEventListener('click', function () {
            importSharedList(data);
        });

        $('#btn-dismiss').addEventListener('click', function () {
            importBanner.classList.add('hidden');
            window.history.replaceState(null, '', window.location.pathname);
        });
    }

    // --- Init ---
    checkForSharedList();
    renderListsOverview();
})();
