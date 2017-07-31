/**
 * Файл вставляемый на страницу при тестировании из phantomjs
 */

///////////////////////////////////////////////
// Вспомагательные функции для тестирования
///////////////////////////////////////////////

function render(name, time, callback)
{
    var def = new $.Deferred();

    if(!time)
    {
        time = 10
    }

    setTimeout(function(name){
        console.log("render " + name)
        setTimeout(function(){

            if(callback)
            {
                callback(name)
            }

            def.resolve()
        }, 10)
    }, time, name, 0)

    return def.promise();
}

function saveReport()
{
    $("body").html('<div id="qunit">'+$("#qunit").html()+'</div>');
    $("body").append('<link rel="stylesheet" href="'+window.pmStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">')
    console.log("saveReport")
}

/**
 * Вставляет Qunit и запускает выполнение тестов.
 */
function injectQunit()
{
    $("body").append('<link rel="stylesheet" href="'+window.pmStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">')
    $("body").append('<script src="'+ window.pmStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.js"></script>')
    $("body").append('<div id="qunit"></div><div id="qunit-fixture"></div>')

    var intervalId = setInterval(function()
    {
        if(!window.QUnit)
        {
            return;
        }

        console.log("Начинаем тесты от Qunit");
        clearInterval(intervalId)

        //QUnit.config.autostart = false
        //QUnit.config.reorder = false

        QUnit.done(function( details ) {
          console.log( "Total: "+ details.total+ " Failed: "+ details.failed+ " Passed: "+ details.passed+ " Runtime: "+ details.runtime );
        });

        QUnit.testDone(function(details){
            var result = {
                "Module name": details.module,
                "Test name": details.name,
                "Assertions": {
                    "Total": details.total,
                    "Passed": details.passed,
                    "Failed": details.failed
                },
                "Skipped": details.skipped,
                "Runtime": details.runtime
            };

            console.log( JSON.stringify( result, null, 2 ) );

            if(!syncQUnit.nextTest())
            {
                saveReport()
                render("ok-done", 0, window.close)
            }
        })

        qunitAddTests()
        syncQUnit.nextTest()

    }, 500)
}


///////////////////////////////////////////////
// Дополнения для QUnit для последовательного выполнения тестов.
///////////////////////////////////////////////
syncQUnit = {}
syncQUnit.testsArray = []
syncQUnit.addTest = function(name, test)
{
    syncQUnit.testsArray.push({name:name, test:test})
}

syncQUnit.nextTest = function(name, test)
{
    if(!syncQUnit.testsArray.length)
    {
        return false;
    }

    var test = syncQUnit.testsArray.shift()

    $.notify("Test "+test.name+", "+syncQUnit.testsArray.length+" tests remain", "warn");

    QUnit.test(test.name, test.test);
    //syncQUnit.nextTest()
    //QUnit.start()
    return true;
}

///////////////////////////////////////////////
// Функции тестирования
///////////////////////////////////////////////

/**
 * В этой функции должны быть qunit тесты для приложения
 */
function qunitAddTests()
{
    syncQUnit.addTest('trim', function ( assert ) {
        var done = assert.async();
        assert.equal(trim(''), '', 'Пустая строка');
        assert.ok(trim('   ') === '', 'Строка из пробельных символов');
        assert.equal(trim(), '', 'Без параметра');

        assert.equal(trim(' x'), 'x', 'Начальные пробелы');
        assert.equal(trim('x '), 'x', 'Концевые пробелы');
        assert.equal(trim(' x '), 'x', 'Пробелы с обоих концов');
        assert.equal(trim('    x  '), 'x', 'Табы');
        assert.equal(trim('    x   y  '), 'x   y', 'Табы и пробелы внутри строки не трогаем');

        done();
    });

    qunitAddTests_users()
    qunitAddTests_hosts()
    qunitAddTests_groups()
    qunitAddTests_inventories()
    qunitAddTests_projects()
}

/**
 * Тестирование users
 */
function qunitAddTests_users()
{
    syncQUnit.addTest('Открытие списка пользователей', function ( assert )
    {
        var done = assert.async();

        $.when(spajs.open({ menuId:"users"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню users');
            render("users", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню users');
            render("users", 1000, done)
        })
    });

    syncQUnit.addTest('Открытие страницы добавления пользователя', function ( assert )
    {
        var done = assert.async();

        // Открытие пункта меню new-user
        $.when(spajs.open({ menuId:"new-user"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню new-user');
            render("users-new-user", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню new-user');
            render("users-new-user", 1000, done)
        })
    });

    var t = new Date();
    t = t.getTime()

    syncQUnit.addTest('Создание пользователя', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания пользователя
        var done = assert.async();

        // Заполнение формы с данными пользователя
        $("#new_user_username").val("test-user-"+t);
        $("#new_user_password").val("test-user-"+t);
        $("#new_user_email").val("test@user.ru");
        $("#new_user_first_name").val("test");
        $("#new_user_last_name").val("user");

        // Отправка формы с данными пользователя
        $.when(pmUsers.addItem()).done(function()
        {
            assert.ok(true, 'Успешно user add Item');
            render("users-add-new-user", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при user add Item');
            render("users-add-new-user", 1000, done)
        })
    });

    syncQUnit.addTest('Изменение пользователя', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
        // с адресом http://192.168.0.12:8080/?user-5
        var userId = /user\/([0-9]+)/.exec(window.location.href)[1]

        $("#user_"+userId+"_username").val("test2-user-"+t);
        $("#user_"+userId+"_password").val("test2-user-"+t);
        $("#user_"+userId+"_email").val("test2@user.ru");
        $("#user_"+userId+"_first_name").val("test2-"+t);
        $("#user_"+userId+"_last_name").val("user2-"+t);

        $.when(pmUsers.updateItem(userId)).done(function()
        {
            assert.ok(true, 'Успешно update add Item');
            render("users-update-user", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при update add Item');
            render("users-update-user", 1000, done)
        })
    });

    syncQUnit.addTest('Удаление пользователя', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
        // с адресом http://192.168.0.12:8080/?user-5
        var userId = /user\/([0-9]+)/.exec(window.location.href)[1]

        // Удаление пользователя.
        $.when(pmUsers.deleteItem(userId, true)).done(function()
        {
            assert.ok(true, 'Успешно delete add Item');
            render("users-delete-user", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при delete add Item');
            render("users-delete-user", 1000, done)
        })
    });
}


/**
 * Тестирование hosts
 */
function qunitAddTests_hosts()
{
    syncQUnit.addTest('Открытие списка хостов', function ( assert )
    {
        var done = assert.async();

        $.when(spajs.open({ menuId:"hosts"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню hosts');
            render("hosts", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню hosts');
            render("hosts", 1000, done)
        })
    });

    syncQUnit.addTest('Постраничная навигация хостов', function ( assert )
    {
        var done = assert.async();

        $.when(spajs.open({ menuId:"hosts/page/999"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню hosts');
            render("hosts_page_999", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню hosts');
            render("hosts_page_999", 1000, done)
        })
    });

    syncQUnit.addTest('Страница создания хоста', function ( assert )
    {
        var done = assert.async();

        // Открытие пункта меню new-host
        $.when(spajs.open({ menuId:"new-host"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню new-host');
            render("hosts-new-host", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню new-host');
            render("hosts-new-host", 1000, done)
        })
    });

    var t = new Date();
    t = t.getTime()

    syncQUnit.addTest('Создание хоста', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания хоста
        var done = assert.async();

        // Заполнение формы с данными хоста
        $("#new_host_name").val("test-host-"+t);
        $("#new_host_type").val("HOST");

        $("#new_json_name").val("test1");
        $("#new_json_value").val("val1");
        jsonEditor.jsonEditorAddVar();

        $("#new_json_name").val("test2");
        $("#new_json_value").val("val2");
        jsonEditor.jsonEditorAddVar();


        // Отправка формы с данными хоста
        $.when(pmHosts.addItem()).done(function()
        {
            assert.ok(true, 'Успешно host add Item');
            render("hosts-add-new-host", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при user add Item');
            render("hosts-add-new-host", 1000, done)
        })
    });

    syncQUnit.addTest('Изменение хоста', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования хоста
        // с адресом http://192.168.0.12:8080/?host-5
        var itemId = /host\/([0-9]+)/.exec(window.location.href)[1]

        $("#host_"+itemId+"_name").val("test2-hosts-"+t);

        $("#new_json_name").val("test3");
        $("#new_json_value").val("val3");
        jsonEditor.jsonEditorAddVar();


        $.when(pmHosts.updateItem(itemId)).done(function()
        {
            assert.ok(true, 'Успешно update add Item');
            render("hosts-update-host", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при update add Item');
            render("hosts-update-host", 1000, done)
        })
    });

    syncQUnit.addTest('Удаление хоста', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования хоста
        // с адресом http://192.168.0.12:8080/?host-5
        var itemId = /host\/([0-9]+)/.exec(window.location.href)[1]

        // Удаление хоста.
        $.when(pmHosts.deleteItem(itemId, true)).done(function()
        {
            assert.ok(true, 'Успешно delete add Item');
            render("hosts-delete-host", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при delete add Item');
            render("hosts-delete-host", 1000, done)
        })
    });
}


/**
 * Тестирование groups
 */
function qunitAddTests_groups()
{
    syncQUnit.addTest('Проверка функции validateHostName', function ( assert ) {
        var done = assert.async();

        assert.ok(!pmGroups.validateHostName(), 'Host')
        assert.ok(!pmGroups.validateRangeName(), 'Range')

        assert.ok(pmGroups.validateHostName("192.168.0.12"), 'Host 192.168.0.12')
        assert.ok(pmGroups.validateHostName("local"), 'Host local')
        assert.ok(pmGroups.validateHostName("loc.ru"), 'Host loc.ru')

        assert.ok(pmGroups.validateRangeName("192.168.0.12"), 'Range 192.168.0.12')
        assert.ok(pmGroups.validateRangeName("local"), 'Range local')
        assert.ok(pmGroups.validateRangeName("loc.ru"), 'Range loc.ru')

        assert.ok(pmGroups.validateRangeName("19[2:7].168.0.12"), 'Range 19[2:7].168.0.12')
        assert.ok(pmGroups.validateRangeName("loc[a:f]l"), 'Range loc[a:f]l')
        assert.ok(pmGroups.validateRangeName("loc.[a:f]u"), 'Range loc.[a:f]u')

        done();
    });

    syncQUnit.addTest('Список групп', function ( assert )
    {
        var done = assert.async();

        $.when(spajs.open({ menuId:"groups"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню groups');
            render("groups", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню groups');
            render("groups", 1000, done)
        })
    });

    syncQUnit.addTest('Страница создания группы', function ( assert )
    {
        var done = assert.async();

        // Открытие пункта меню new-host
        $.when(spajs.open({ menuId:"new-group"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню new-group');
            render("groups-new-group", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню new-group');
            render("groups-new-group", 1000, done)
        })
    });

    var t = new Date();
    t = t.getTime()

    syncQUnit.addTest('Сохранение группы', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания группы
        var done = assert.async();

        // Заполнение формы с данными группы
        $("#new_group_name").val("test-group-"+t);

        $("#new_json_name").val("test1");
        $("#new_json_value").val("val1");
        jsonEditor.jsonEditorAddVar();

        $("#new_json_name").val("test2");
        $("#new_json_value").val("val2");
        jsonEditor.jsonEditorAddVar();

        $("#new_group_children").addClass('selected');

        // Отправка формы с данными группы
        $.when(pmGroups.addItem()).done(function()
        {
            assert.ok(true, 'Успешно group add Item');
            render("groups-add-new-group", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при group add Item');
            render("groups-add-new-group", 1000, done)
        })
    });

    syncQUnit.addTest('Обновление группы', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования группы
        // с адресом http://192.168.0.12:8080/?group-5
        var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

        $("#group_"+itemId+"_name").val("test2-group-"+t);

        $("#new_json_name").val("test3");
        $("#new_json_value").val("val3");
        jsonEditor.jsonEditorAddVar();


        $.when(pmGroups.updateItem(itemId)).done(function()
        {
            assert.ok(true, 'Успешно update add Item');
            render("groups-update-group", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при update add Item');
            render("groups-update-group", 1000, done)
        })
    });

    syncQUnit.addTest('Открытие страницы создания подгруппы', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования группы
        // с адресом http://192.168.0.12:8080/?group-5
        var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

        // Открытие пункта меню new-host
        $.when(spajs.open({ menuId:"group/"+itemId+"/new-group"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню создания подгруппы new-group');
            render("groups-new-sub-group", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню создания подгруппы new-group');
            render("groups-new-sub-group", 1000, done)
        })
    });

    syncQUnit.addTest('Сохранение подгруппы', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания группы
        var done = assert.async();

        // Заполнение формы с данными группы
        $("#new_group_name").val("test-sub-group-"+t);

        $("#new_json_name").val("test1");
        $("#new_json_value").val("val1");
        jsonEditor.jsonEditorAddVar();

        $("#new_json_name").val("test2");
        $("#new_json_value").val("val2");
        jsonEditor.jsonEditorAddVar();

        var master_group_itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

        // Отправка формы с данными группы
        $.when(pmGroups.addItem('group', master_group_itemId)).done(function()
        {
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
            if(master_group_itemId != itemId)
            {
                assert.ok(false, 'Ошибка при добавлении подгруппы ' + master_group_itemId +"!="+ itemId);
                render("groups-add-new-sub-group", 1000, done)
            }
            else
            {
                assert.ok(true, 'Успешно group sub add Item');
                render("groups-add-new-sub-group", 1000, done)
            }

        }).fail(function()
        {
            assert.ok(false, 'Ошибка при group sub add Item');
            render("groups-add-new-sub-group", 1000, done)
        })
    });

    syncQUnit.addTest('Проверка добавления невалидных подгрупп', function ( assert )
    {
        var done = assert.async();
        var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
        $.when(pmGroups.addSubGroups(itemId, [999999])).done(function()
        {
            assert.ok(false, 'Ошибка при добавлении подгруппы 999999 вроде бы нет');
            done()
        }).fail(function()
        {
            assert.ok(true, 'Проверка добавления невалидных подгрупп успешна');
            done()
        })
    })

    syncQUnit.addTest('Проверка добавления невалидных хостов', function ( assert )
    {
        var done = assert.async();
        var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
        $.when(pmGroups.addSubHosts(itemId, [999999])).done(function()
        {
            assert.ok(false, 'Ошибка при добавлении хоста 999999 вроде бы нет');
            done()
        }).fail(function()
        {
            assert.ok(true, 'Проверка добавления невалидных хостов успешна');
            done()
        })
    })

    syncQUnit.addTest('Удаление группы', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования группы
        // с адресом http://192.168.0.12:8080/?group-5
        var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

        // Удаление группы.
        $.when(pmGroups.deleteItem(itemId, true)).done(function()
        {
            assert.ok(true, 'Успешно delete add Item');
            render("groups-delete-group", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при delete add Item');
            render("groups-delete-group", 1000, done)
        })
    });
}


/**
 * Тестирование inventories
 */
function qunitAddTests_inventories()
{
    syncQUnit.addTest('Список инвенториев', function ( assert )
    {
        var done = assert.async();

        $.when(spajs.open({ menuId:"inventories"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню inventories');
            render("inventories", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню inventories');
            render("inventories", 1000, done)
        })
    });

    syncQUnit.addTest('Страница нового inventory', function ( assert )
    {
        var done = assert.async();

        // Открытие пункта меню new-inventory
        $.when(spajs.open({ menuId:"new-inventory"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню new-inventory');
            render("groups-new-inventory", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню new-inventory');
            render("groups-new-inventory", 1000, done)
        })
    });

    var t = new Date();
    t = t.getTime()

    syncQUnit.addTest('Сохранение нового inventory', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания inventory
        var done = assert.async();

        // Заполнение формы с данными inventory
        $("#new_inventory_name").val("test-inventory-"+t);

        $("#new_json_name").val("test1");
        $("#new_json_value").val("val1");
        jsonEditor.jsonEditorAddVar();

        $("#new_json_name").val("test2");
        $("#new_json_value").val("val2");
        jsonEditor.jsonEditorAddVar();


        // Отправка формы с данными inventory
        $.when(pmInventories.addItem()).done(function()
        {
            assert.ok(true, 'Успешно inventory add Item');
            render("groups-add-new-inventory", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при inventory add Item');
            render("groups-add-new-inventory", 1000, done)
        })
    });

    syncQUnit.addTest('Обновление inventory', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования inventory
        // с адресом http://192.168.0.12:8080/?group-5
        var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]

        $("#inventory_"+itemId+"_name").val("test2-inventory-"+t);

        $("#new_json_name").val("test3");
        $("#new_json_value").val("val3");
        jsonEditor.jsonEditorAddVar();

        $.when(pmInventories.updateItem(itemId)).done(function()
        {
            assert.ok(true, 'Успешно update add Item');
            render("inventories-update-inventory", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при update add Item');
            render("inventories-update-inventory", 1000, done)
        })
    });

    syncQUnit.addTest('Проверка добавления невалидных подгрупп к inventory', function ( assert )
    {
        var done = assert.async();
        var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]
        $.when(pmInventories.addSubGroups(itemId, [999999])).done(function()
        {
            assert.ok(false, 'Ошибка при добавлении подгруппы 999999 вроде бы нет');
            done()
        }).fail(function()
        {
            assert.ok(true, 'Проверка добавления невалидных подгрупп успешна');
            done()
        })
    })

    syncQUnit.addTest('Проверка добавления невалидных хостов к inventory', function ( assert )
    {
        var done = assert.async();
        var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]
        $.when(pmInventories.addSubHosts(itemId, [999999])).done(function()
        {
            assert.ok(false, 'Ошибка при добавлении хоста 999999 вроде бы нет');
            done()
        }).fail(function()
        {
            assert.ok(true, 'Проверка добавления невалидных хостов успешна');
            done()
        })
    })

    syncQUnit.addTest('Удаление inventory', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования inventory
        // с адресом http://192.168.0.12:8080/?inventory-5
        var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]

        // Удаление inventory.
        $.when(pmInventories.deleteItem(itemId, true)).done(function()
        {
            assert.ok(true, 'Успешно delete Item');
            render("inventories-delete-inventory", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при delete Item');
            render("inventories-delete-inventory", 1000, done)
        })
    });
}

/**
 * Тестирование projects
 */
function qunitAddTests_projects()
{
    syncQUnit.addTest('projects', function ( assert )
    {
        var done = assert.async();

        $.when(spajs.open({ menuId:"projects"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню projects');
            render("projects", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню projects');
            render("projects", 1000, done)
        })
    });

    syncQUnit.addTest('new-project', function ( assert )
    {
        var done = assert.async();

        // Открытие пункта меню new-project
        $.when(spajs.open({ menuId:"new-project"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню new-project');
            render("groups-new-project", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при открытиии меню new-project');
            render("groups-new-project", 1000, done)
        })
    });

    var t = new Date();
    t = t.getTime()

    syncQUnit.addTest('new-project-save', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания project
        var done = assert.async();

        // Заполнение формы с данными project
        $("#new_project_name").val("test-project-"+t);
        $("#new_project_repository").val("git://test-project-"+t);

        $("#new_json_name").val("test1");
        $("#new_json_value").val("val1");
        jsonEditor.jsonEditorAddVar();

        $("#new_json_name").val("test2");
        $("#new_json_value").val("val2");
        jsonEditor.jsonEditorAddVar();


        // Отправка формы с данными project
        $.when(pmProjects.addItem()).done(function()
        {
            assert.ok(true, 'Успешно project add Item');
            render("groups-add-new-project", 1000, done)
        }).fail(function()
        {
            assert.ok(false, 'Ошибка при project add Item');
            render("groups-add-new-project", 1000, done)
        })
    });

    syncQUnit.addTest('update-project', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования project
        // с адресом http://192.168.0.12:8080/?group-5
        var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

        $("#project_"+itemId+"_name").val("test2-project-"+t);

        $("#new_json_name").val("test3");
        $("#new_json_value").val("val3");
        jsonEditor.jsonEditorAddVar();


        $.when(pmProjects.updateItem(itemId)).done(function()
        {
            assert.ok(true, 'Успешно update add Item');
            render("projects-update-project", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при update add Item');
            render("projects-update-project", 1000, done)
        })
    });

    syncQUnit.addTest('delete-project', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования project
        // с адресом http://192.168.0.12:8080/?project-5
        var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

        // Удаление project.
        $.when(pmProjects.deleteItem(itemId, true)).done(function()
        {
            assert.ok(true, 'Успешно delete Item');
            render("projects-delete-project", 1000, done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при delete Item');
            render("projects-delete-project", 1000, done)
        })
    });
}

    injectQunit()