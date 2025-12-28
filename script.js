var bookDataFromLocalStorage = [];
var bookLendDataFromLocalStorage = [];

var state = "";

var stateOption = {
    "add": "add",
    "update": "update"
};

$(function () {
    loadBookData();
    registerRegularComponent();

    //Kendo Window reference
    //初始化：Configuration
    //初始化後、在其他時間顛要控制 Kendo 物件：Methods、key data("kendoXXXX")
    //初始化時綁定 Kendo 的事件(Ex.當 Kendo Window 關閉時要做一些事情(Call function)：Events
    //https://www.telerik.com/kendo-jquery-ui/documentation/api/javascript/ui/window#configuration
    $("#book_detail_area").kendoWindow({
        width: "1200px",
        title: "新增書籍",
        visible: false,
        modal: true,
        actions: ["Close"]
    }).data("kendoWindow").center();

    $("#book_record_area").kendoWindow({
        width: "700px",
        title: "借閱紀錄",
        visible: false,
        modal: true,
        actions: ["Close"]
    }).data("kendoWindow").center();

    // 綁定按鈕事件
    $("#btn_add_book").click(function (e) {
        e.preventDefault();
        state = stateOption.add;

        setStatusKeepRelation();

        $("#btn-save").css("display", "");
        toggleMode(true);
        $("#book_detail_area").data("kendoWindow").title("新增書籍");
        $("#book_detail_area").data("kendoWindow").open();
    });

    $("#btn_query").click(function (e) {
        e.preventDefault();
        queryBook();
    });

    $("#btn_clear").click(function (e) {
        e.preventDefault();
        clear();
        queryBook(); // 清除後重新查詢以顯示全部
    });

    
    $("#btn-save").click(function (e) {
        e.preventDefault();

        //TODO : 存檔前請作必填的檢查
        var validator = $("#book_detail_area").kendoValidator().data("kendoValidator");
        if (!validator.validate()) {
            return;
        }

        // 根據狀態執行
        switch (state) {
            case "add":
                addBook();
                break;
            case "update":
                var currentBookId = $("#book_id_d").val();
                updateBook(currentBookId);
                break;
        }
    });

    // 初始化書籍 Grid
    $("#book_grid").kendoGrid({
        dataSource: {
            data: bookDataFromLocalStorage,
            schema: {
                model: {
                    id: "BookId",
                    fields: {
                        BookId: { type: "int" },
                        BookClassName: { type: "string" },
                        BookName: { type: "string" },
                        BookBoughtDate: { type: "string" },
                        BookStatusName: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            pageSize: 20
        },
        height: 550,
        sortable: true,
        pageable: {
            input: true,
            numeric: false
        },
        columns: [
            { field: "BookId", title: "書籍編號", width: "10%" },
            { field: "BookClassName", title: "圖書類別", width: "15%" },
            { 
                field: "BookName", title: "書名", width: "30%",
                template: "<a style='cursor:pointer; color:blue' onclick='showBookForDetail(event,#:BookId #)'>#: BookName #</a>"
            },
            { field: "BookBoughtDate", title: "購書日期", width: "15%" },
            { field: "BookStatusName", title: "借閱狀態", width: "15%" },
            { field: "BookKeeperCname", title: "借閱人", width: "15%" },
            { command: { text: "借閱紀錄", click: showBookLendRecord }, title: " ", width: "120px" },
            { command: { text: "修改", click: showBookForUpdate }, title: " ", width: "100px" },
            { command: { text: "刪除", click: deleteBook }, title: " ", width: "100px" }
        ]
    });

    // 初始化借閱紀錄 Grid
    $("#book_record_grid").kendoGrid({
        dataSource: {
            data: [],
            schema: {
                model: {
                    fields: {
                        LendDate: { type: "string" },
                        BookKeeperId: { type: "string" },
                        BookKeeperEname: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            pageSize: 20
        },
        height: 250,
        sortable: true,
        pageable: {
            input: true,
            numeric: false
        },
        columns: [
            { field: "LendDate", title: "借閱日期", width: "10%" },
            { field: "BookKeeperId", title: "借閱人編號", width: "10%" },
            { field: "BookKeeperEname", title: "借閱人英文姓名", width: "15%" },
            { field: "BookKeeperCname", title: "借閱人中文姓名", width: "15%" }
        ]
    });
});

/**
 * 初始化 localStorage 資料
 * 將 data 內的 book-data.js..bookData；book-lend-record.js..lendData 寫入 localStorage 作為"資料庫"使用
 */
function loadBookData() {
    bookDataFromLocalStorage = JSON.parse(localStorage.getItem("bookData"));
    if (bookDataFromLocalStorage == null) {
        bookDataFromLocalStorage = bookData;
        localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    }

    bookLendDataFromLocalStorage = JSON.parse(localStorage.getItem("lendData"));
    if (bookLendDataFromLocalStorage == null) {
        bookLendDataFromLocalStorage = lendData;
        localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));
    }
}

function onChange() {
    //TODO : 請完成遺漏的邏輯
    var selectedValue = $("#book_class_d").data("kendoDropDownList").value();
    if (selectedValue === "") {
        $("#book_image_d").attr("src", "image/optional.jpg");
    } else {
        $("#book_image_d").attr("src", "image/" + selectedValue + ".jpg");
    }
}

/**
 * 新增書籍
 */
function addBook() {
    //TODO：請完成新增書籍的相關功能
    var maxId = 0;
    if (bookDataFromLocalStorage.length > 0) {
        var ids = bookDataFromLocalStorage.map(function (b) {
            return b.BookId;
        });
        maxId = Math.max.apply(null, ids);
    }
    var newId = maxId + 1;

    var defaultStatusText = "";
    var foundStatus = bookStatusData.filter(function (m) {
        return m.StatusId == "A";
    });
    if (foundStatus.length > 0) {
        defaultStatusText = foundStatus[0].StatusText;
    }

    var book = {
        "BookId": newId,
        "BookName": $("#book_name_d").val(),
        "BookClassId": $("#book_class_d").data("kendoDropDownList").value(),
        "BookClassName": $("#book_class_d").data("kendoDropDownList").text(), 
        "BookBoughtDate": kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(), "yyyy-MM-dd"),
        "BookStatusId": "A",
        "BookStatusName": defaultStatusText,
        "BookKeeperId": "",
        "BookKeeperCname": "",
        "BookKeeperEname": "",
        "BookAuthor": $("#book_author_d").val(),         
        "BookPublisher": $("#book_publisher_d").val(),   
        "BookNote": $("#book_note_d").val()              
    };

    bookDataFromLocalStorage.push(book);
    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));

    $("#book_grid").data("kendoGrid").dataSource.add(book);

    alert("新增成功！");
    $("#book_detail_area").data("kendoWindow").close();
}

/**
 * 更新書籍
 */
function updateBook(bookId) {
    //TODO：請完成更新書籍的相關功能
    var book = bookDataFromLocalStorage.filter(function (m) {
        return m.BookId == bookId;
    })[0];

    if (!book) {
        alert("找不到書籍資料！");
        return;
    }

    // 更新欄位
    book.BookName = $("#book_name_d").val();
    book.BookAuthor = $("#book_author_d").val();
    book.BookPublisher = $("#book_publisher_d").val();
    book.BookNote = $("#book_note_d").val();

    var classDropDownList = $("#book_class_d").data("kendoDropDownList");
    book.BookClassId = classDropDownList.value();
    book.BookClassName = classDropDownList.text();

    var statusDropDownList = $("#book_status_d").data("kendoDropDownList");
    book.BookStatusId = statusDropDownList.value();
    book.BookStatusName = statusDropDownList.text();

    var datePicker = $("#book_bought_date_d").data("kendoDatePicker");
    book.BookBoughtDate = kendo.toString(datePicker.value(), "yyyy-MM-dd");

    var keeperId = $("#book_keeper_d").data("kendoDropDownList").value();

    if (book.BookStatusId == "B" || book.BookStatusId == "C") {
        var keeper = memberData.filter(function (m) {
            return m.UserId == keeperId;
        })[0];

        book.BookKeeperId = keeperId;
        book.BookKeeperCname = keeper ? keeper.UserCname : "";
        book.BookKeeperEname = keeper ? keeper.UserEname : "";
    } else {
        book.BookKeeperId = "";
        book.BookKeeperCname = "";
        book.BookKeeperEname = "";
    }

    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));

    var grid = $("#book_grid").data("kendoGrid");
    grid.dataSource.pushUpdate(book);

    if (book.BookStatusId == "B" || book.BookStatusId == "C") {
        addBookLendRecord();
    }

    alert("修改成功！");
    $("#book_detail_area").data("kendoWindow").close();
}

 /**新增借閱紀錄 */
function addBookLendRecord() {
    //TODO：請完成新增借閱紀錄相關功能
    var bookId = $("#book_id_d").val();
    var keeperId = $("#book_keeper_d").data("kendoDropDownList").value();

    var keeper = memberData.filter(function (m) {
        return m.UserId == keeperId;
    })[0];

    var record = {
        "BookId": bookId, 
        "BookKeeperId": keeperId,
        "BookKeeperCname": keeper ? keeper.UserCname : "",
        "BookKeeperEname": keeper ? keeper.UserEname : "",
        "LendDate": kendo.toString(new Date(), "yyyy-MM-dd")
    };

    bookLendDataFromLocalStorage.push(record);
    localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));
}

/**
 * 查詢書籍 
 */
function queryBook() {
    var grid = getBooGrid();
    var filtersCondition = [];

    // 使用 contains 做模糊搜尋
    var bookName = $("#book_name_q").val();
    // 檢查不為空也不為 undefined
    if (bookName && bookName.trim() !== "") {
        filtersCondition.push({ 
            field: "BookName", 
            operator: "contains", 
            value: bookName.trim() 
        });
    }

    // 其他使用 eq (等於)，做精確比對
    var bookClassId = $("#book_class_q").data("kendoDropDownList").value();
    if (bookClassId && bookClassId !== "") {
        filtersCondition.push({ 
            field: "BookClassId", 
            operator: "eq", 
            value: bookClassId 
        });
    }

    var bookKeeperId = $("#book_keeper_q").data("kendoDropDownList").value();
    if (bookKeeperId && bookKeeperId !== "") {
        filtersCondition.push({ 
            field: "BookKeeperId", 
            operator: "eq", 
            value: bookKeeperId 
        });
    }

    var bookStatusId = $("#book_status_q").data("kendoDropDownList").value();
    if (bookStatusId && bookStatusId !== "") {
        filtersCondition.push({ 
            field: "BookStatusId", 
            operator: "eq", 
            value: bookStatusId 
        });
    }

    // 所有條件都要符合
    grid.dataSource.filter({
        logic: "and",
        filters: filtersCondition
    });
}

/**
 * 刪除書籍
 */
function deleteBook(e) {
    e.preventDefault();

    var grid = $("#book_grid").data("kendoGrid");
    var dataItem = grid.dataItem(e.target.closest("tr"));

    //檢查書籍狀態，如狀態是 B 或 C 禁止刪除
    if (dataItem.BookStatusId == "B" || dataItem.BookStatusId == "C") {
        alert("該書籍目前為「" + dataItem.BookStatusName + "」狀態，無法刪除！\n請先歸還書籍後再試。");
        return; // 直接結束函式，不執行後續動作
    }

    if (!confirm("確定要刪除 [" + dataItem.BookName + "] 嗎？")) {
        return;
    }

    //處理 bookData 
    var bookIndex = -1;
    for (var i = 0; i < bookDataFromLocalStorage.length; i++) {
        if (bookDataFromLocalStorage[i].BookId == dataItem.BookId) {
            bookIndex = i;
            break;
        }
    }

    if (bookIndex > -1) {
        bookDataFromLocalStorage.splice(bookIndex, 1);
    }

    //刪除相關 lendData
    bookLendDataFromLocalStorage = bookLendDataFromLocalStorage.filter(function (r) {
        return r.BookId != dataItem.BookId;
    });

    // 儲存
    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));

    // 更新畫面 
    grid.dataSource.remove(dataItem);
    
    alert("刪除成功");
}

/**
 * 顯示圖書編輯畫面
 */
function showBookForUpdate(e) {
    e.preventDefault();

    state = stateOption.update;
    $("#book_detail_area").data("kendoWindow").title("修改書籍");
    $("#btn-save").css("display", "");

    var grid = getBooGrid();
    var bookId = grid.dataItem(e.target.closest("tr")).BookId;

    bindBook(bookId);
    toggleMode(true);
    setStatusKeepRelation();
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * 顯示圖書明細畫面
 */
function showBookForDetail(e, bookId) {
    e.preventDefault(); 

    //TODO : 請補齊未完成的功能
    $("#book_detail_area").data("kendoWindow").title("書籍明細");

    bindBook(bookId);
    toggleMode(false);

    $("#book_status_d_col").show();
    $("#book_keeper_d_col").show();

    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * 繫結圖書資料
 */
function bindBook(bookId) {
    var book = bookDataFromLocalStorage.filter(function (m) {
        return m.BookId == bookId;
    })[0];

    if (!book) return; // 防呆

    $("#book_id_d").val(bookId);
    $("#book_name_d").val(book.BookName);
    $("#book_author_d").val(book.BookAuthor);
    $("#book_publisher_d").val(book.BookPublisher);
    $("#book_note_d").val(book.BookNote); 
    //TODO : 完成尚未完成的程式碼
    
    $("#book_class_d").data("kendoDropDownList").value(book.BookClassId);
    $("#book_status_d").data("kendoDropDownList").value(book.BookStatusId);
    $("#book_keeper_d").data("kendoDropDownList").value(book.BookKeeperId);

    $("#book_bought_date_d").data("kendoDatePicker").value(new Date(book.BookBoughtDate));

    onChange();
}

function showBookLendRecord(e) {
    //TODO : 請補齊未完成的功能
    e.preventDefault();
    var grid = getBooGrid();
    var dataItem = grid.dataItem(e.target.closest("tr"));

    var bookLendRecordData = bookLendDataFromLocalStorage.filter(function (record) {
        return record.BookId == dataItem.BookId;
    });

    $("#book_record_grid").data("kendoGrid").dataSource.data(bookLendRecordData);
    $("#book_record_area").data("kendoWindow").title("借閱紀錄：" + dataItem.BookName).open();
}

/**
 * 清除查詢條件
 */
function clear() {
    //TODO : 請補齊未完成的功能
    $("#book_name_q").val("");

    var dropdownIds = ["book_class_q", "book_keeper_q", "book_status_q"];
    dropdownIds.forEach(function (id) {
        var dropdown = $("#" + id).data("kendoDropDownList");
        if (dropdown) {
            dropdown.select(0);
        }
    });

    queryBook();
}

/**
 * 設定借閱狀態與借閱人關聯
 */
function setStatusKeepRelation() {
    //TODO : 請補齊借閱人與借閱狀態相關邏輯
    switch (state) {
        case "add":
            $("#book_status_d_col").hide();
            $("#book_keeper_d_col").hide();
            $("#book_status_d").prop('required', false);
            $("#book_keeper_d").prop('required', false);
            break;

        case "update":
            var statusId = $("#book_status_d").data("kendoDropDownList").value();
            var keeperDropdown = $("#book_keeper_d").data("kendoDropDownList");

            if (statusId == "B" || statusId == "C") {
                $("#book_keeper_d").prop('required', true);
                keeperDropdown.enable(true);
            } else {
                $("#book_keeper_d").prop('required', false);
                keeperDropdown.value("");
                keeperDropdown.enable(false);

                var validator = $("#book_detail_area").data("kendoValidator");
                if (validator) {
                    validator.validateInput($("#book_keeper_d"));
                }
            }
            break;
    }
}

/**
 * 生成畫面所需的 Kendo 控制項
 */
function registerRegularComponent() {
    $("#book_class_q").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        dataSource: classData,
        optionLabel: "請選擇",
        index: 0
    });

    $("#book_class_d").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        dataSource: classData,
        optionLabel: "請選擇",
        index: 0,
        change: onChange
    });

    $("#book_keeper_q").kendoDropDownList({
        dataTextField: "UserCname",
        dataValueField: "UserId",
        dataSource: memberData,
        optionLabel: "請選擇",
        index: 0
    });

    $("#book_keeper_d").kendoDropDownList({
        dataTextField: "UserCname",
        dataValueField: "UserId",
        dataSource: memberData,
        optionLabel: "請選擇",
        index: 0
    });

    $("#book_status_q").kendoDropDownList({
        dataTextField: "StatusText",
        dataValueField: "StatusId",
        dataSource: bookStatusData,
        optionLabel: "請選擇",
        index: 0
    });

    $("#book_status_d").kendoDropDownList({
        dataTextField: "StatusText",
        dataValueField: "StatusId",
        dataSource: bookStatusData,
        optionLabel: "請選擇",
        change: setStatusKeepRelation,
        index: 0
    });

    $("#book_bought_date_d").kendoDatePicker({
        value: new Date(),
        format: "yyyy-MM-dd"
    });

    $("#book_detail_area").kendoValidator();
}

/**
 * 取得畫面上的 BookGrid
 */
function getBooGrid() {
    return $("#book_grid").data("kendoGrid");
}

/**
 * 切換編輯模式
 */
function toggleMode(isEditable) {
    $("#book_class_d").data("kendoDropDownList").enable(isEditable);
    $("#book_keeper_d").data("kendoDropDownList").enable(isEditable);
    $("#book_status_d").data("kendoDropDownList").enable(isEditable);
    $("#book_bought_date_d").data("kendoDatePicker").enable(isEditable);

    if (isEditable) {
        $("#book_detail_area input, #book_detail_area textarea").prop("disabled", false);
        $("#btn-save").show();
    } else {
        $("#book_detail_area input, #book_detail_area textarea").prop("disabled", true);
        $("#btn-save").hide();
    }
}