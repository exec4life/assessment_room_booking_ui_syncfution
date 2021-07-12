import React from 'react';
import './App.css';

import { ScheduleComponent, Day, Week, WorkWeek, Agenda, Month, Inject,
  ViewsDirective, ViewDirective } 
  from '@syncfusion/ej2-react-schedule';
import { DataManager, UrlAdaptor, WebApiAdaptor, Query } from '@syncfusion/ej2-data';
import { ListBoxComponent, DropDownList } from '@syncfusion/ej2-react-dropdowns';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      roomIds: [],
      slectedRoom: 0,
      userId: 1,
      requestType: '',
      toastMsg: {
        id: 0,
        title: 'Message',
        content: ''
      },
      systemErrorCount: 0
    };

    this.roomsDataManager = new DataManager({
        url: 'http://localhost:8000/api/room/list',
        adaptor: new WebApiAdaptor(),
    });
    
    this.scheduleDataManager = new DataManager({
      url: 'http://localhost:8000/api/schedule/list',
      crudUrl: 'http://localhost:8000/api/schedule/syncfusion',
      adaptor: new UrlAdaptor()
    });

    this.scheduleObj = {};
    this.roomlistBoxObj = {};
    this.toastInstance = {};
    this.roomDrowDownList = {};

    this.onRoomListBoxChange = this.onRoomListBoxChange.bind(this);
    this.onScheduleActionBegin = this.onScheduleActionBegin.bind(this);
    this.onEditSchedulePopupOpen = this.onEditSchedulePopupOpen.bind(this);
    this.onEditSchedulePopupClose = this.onEditSchedulePopupClose.bind(this);
    this.onScheduleActionComplete = this.onScheduleActionComplete.bind(this);
    this.onScheduleActionFailure = this.onScheduleActionFailure.bind(this);
  }
  
  onRoomListBoxChange(args) {
    let slectedRoom = 0;
    // Find the lastest selected room
    let clickedRoomName = args.event.target.innerText;
    for (let i = 0; i < args.items.length; i++) {
      if (args.items[i].Name === clickedRoomName) {
        slectedRoom = args.items[i].Id;
        break;
      }
    }

    // In case just only 1 room is selectd
    if (slectedRoom === 0 && args.value.length === 1) {
      slectedRoom = args.value[0];
    }

    this.setState({ 
      roomIds: args.value,
      slectedRoom: slectedRoom
    }, () => {});
  }
  
  onScheduleActionBegin(args) {
    this.setState({requestType: args.requestType});
  }

  onScheduleActionComplete(args) {
    if (args.requestType === 'eventCreated') {
      this.setState({ toastMsg: { title: 'Create event', content: 'Event `' + args.data[0].Subject + '` is created' }
      }, () => {
          this.toastInstance.show();
      });
    } else if (args.requestType === 'eventChanged') {
      this.setState({ toastMsg: { title: 'Edit event', content: 'Event `' + args.data[0].Subject + '` is changed' }
      }, () => {
          this.toastInstance.show();
      });
    } else if (args.requestType === 'eventRemoved') {
      this.setState({ toastMsg: { title: 'Delete event', content: 'Event `' + args.data[0].Subject + '` is removed' }
      }, () => {
          this.toastInstance.show();
      });
    }
  }
  
  onScheduleEventRendered(args) {
    this.applyScheduleCategoryColor(args, this.scheduleObj.currentView);
  }

  applyScheduleCategoryColor(args, currentView) {
    let categoryColor = args.data.Color;
    if (!args.element || !categoryColor) {
        return;
    }
    if (currentView === 'Agenda') {
        args.element.firstChild.style.borderLeftColor = categoryColor;
    } else {
        args.element.style.backgroundColor = categoryColor;
    }
  }

  onEditSchedulePopupOpen(args) { 
    if (args.type === 'Editor') { 
      // Force open RecurrenceEditor form
      let recurrenceElm = document.querySelector('.e-recurrenceeditor');
      if (recurrenceElm !== undefined) {
        recurrenceElm.classList.remove('e-disable');
      }

      // Add room list selectbox
      if (!args.element.querySelector('.e-location-container-DropDownList')) {
        let oldLocalElm = args.element.querySelector('.e-location-container');
        let parentElm = oldLocalElm.parentNode;
        let newLocalElm = document.createElement('div', { className: 'e-location-container' });
        newLocalElm.setAttribute('class', 'e-location-container e-location-container-DropDownList');
        parentElm.insertBefore(newLocalElm, oldLocalElm);
        oldLocalElm.remove();

        let container = document.createElement('div', { className: 'custom-field-container' });
        let inputEle = document.createElement('input', {
          className: 'e-field', attrs: { id: 'Location', name: 'Location' }
        });
        container.appendChild(inputEle);
        newLocalElm.appendChild(container);

        this.roomDrowDownList = new DropDownList({
          dataSource: this.roomsDataManager,
          fields: { text: 'Name', value: 'Id' },
          floatLabelType: 'Always', placeholder: 'Room',
          value: this.state.slectedRoom,
          htmlAttributes: {'id': 'RoomId', 'name': 'RoomId', 'data-name': 'RoomId'}
        });
        this.roomDrowDownList.appendTo(inputEle);
      } else {
        // Set selected room whenever edit open
        this.roomDrowDownList.value = this.state.slectedRoom;
      }
    }
  }

  onEditSchedulePopupClose(args) {
    // Add roomId & userId to data model before submit
    let roomElm = args.element.querySelector('[name="RoomId"]');
    if (roomElm && args.data) {
      (args.data).RoomId = roomElm.value;
      (args.data).UserId = this.state.userId;
    }
  }
  
  onScheduleActionFailure(args) {
    let msg = 'The error is occurred';
    try { // View error message of any schedule action errors
      let json = JSON.parse(args.error[0].error.response);
      if (json.messages !== undefined && json.messages.length > 0) {
        msg = json.messages.join('; ');
      } else {
        msg = json.message;
      }
      this.setState((prevState) => ({
        toastMsg: { id: 0, title: 'Error', content: msg },
        systemErrorCount: 0
      }), 
      () => {
        this.toastInstance.show();
      });
    } catch(e) { 
      // Just view system error 1 time
      if (this.state.systemErrorCount === 0) {
        this.setState((prevState) => ({
          toastMsg: { id: 0, title: 'Error', content: msg },
          systemErrorCount: 1
        }), 
        () => {
          this.toastInstance.show();
        });
      }
    }
  } 
    
  render() {
    return <div>
      <div>
        <ListBoxComponent ref={this.roomlistBoxObj}
          dataSource={this.roomsDataManager} 
          fields={{text: "Name", value: "Id", Color: "Color"}}
          selectionSettings= {{ selectAll: true }}
          change={this.onRoomListBoxChange} 
          itemTemplate='<div class="list-wrapper" style="background-color: ${Color}"><span class="text">${Name}</span>'/>
      </div>
      <div>
        <ScheduleComponent ref={this.scheduleObj}
              eventSettings={{dataSource: this.scheduleDataManager, 
                query: new Query().addParams('RoomIds', this.state.roomIds)
                  .addParams('RequestType', this.state.requestType), 
                enableTooltip: true}} 
              selectedDate={new Date()} currentView='WorkWeek'
              actionFailure={this.onScheduleActionFailure.bind(this)}
              actionBegin={this.onScheduleActionBegin.bind(this)}
              actionComplete={this.onScheduleActionComplete.bind(this)}
              eventRendered={this.onScheduleEventRendered.bind(this)} 
              // showQuickInfo={false}
              popupOpen={this.onEditSchedulePopupOpen.bind(this)}
              popupClose={this.onEditSchedulePopupClose.bind(this)}
              >
          <ViewsDirective>
            <ViewDirective option='Day' />
            <ViewDirective option='Week' />
            <ViewDirective option='WorkWeek' />
            <ViewDirective option='Month' />
            <ViewDirective option='Agenda' />
          </ViewsDirective>
          <Inject services={[Day, Week, WorkWeek, Month, Agenda]} />
        </ScheduleComponent>
        <ToastComponent ref={toast => this.toastInstance = toast} 
          title={this.state.toastMsg.title} 
          content={this.state.toastMsg.content} 
          newestOnTop='true' 
          showProgressBar='true' 
          progressDirection='Ltr'
          position={{X: 'Center', Y: 'Top'}} />
      </div>
    </div>
    
  }
}
export default App;
