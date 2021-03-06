import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IpData } from '../ip-tracking/ip-tracking.component';
import { MatSort } from '@angular/material/sort';
import { MatDatepicker } from '@angular/material/datepicker';
import { FormControl } from '@angular/forms';
import { CallToActionsService } from 'src/app/services/call-to-actions.service';
import { IpGeoLocaleService } from 'src/app/services/ip-geo-locale.service';

@Component({
  selector: 'app-actions-tracking',
  templateUrl: './actions-tracking.component.html',
  styleUrls: ['./actions-tracking.component.scss']
})
export class ActionsTrackingComponent implements OnInit {
  displayedColumns: string[] = ['ip', 'routePath', 'location', 'date', 'total'];
  dataSource: IpData[] = [];
  ipsData = null;
  ipsDataGeoLocale = [];
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  ipDaniel = '181.59.203.249';
  ipFontanar = '200.118.62.150';
  @ViewChild(MatDatepicker) pickerInit: MatDatepicker<Date>;
  @ViewChild(MatDatepicker) pickerEnd: MatDatepicker<Date>;
  initDate = new FormControl(new Date());
  endDate = new FormControl(new Date());

  constructor(
    private CallToActionsService: CallToActionsService,
    private ipGeoLocaleService: IpGeoLocaleService
  ) {}

  updateGeoLocaleIps() {
    this.ipsData.data.forEach(data => {
      const dataGeoLocaleIp = this.ipsDataGeoLocale.find(geoData => {
        return geoData.ip === data.ip;
      });

      if (!dataGeoLocaleIp) {
        this.ipGeoLocaleService.getDataIp(data.ip).subscribe(data => {
          console.log('=======================================');
          console.log(`Update data for ip:  ${data.ip} (In progress...)`);
          this.ipGeoLocaleService
            .createIpTrack(data)
            .then(res => {
              console.log(`Update data for ip:  ${data.ip} (Success)`);
              console.log(res);
              console.log('=======================================');
            })
            .catch(error => {
              console.log(`Update data for ip:  ${data.ip} (Failed)`);
              console.log(error);
              console.log('=======================================');
            });
        });
      } else {
        console.log('=======================================');
        console.log(`IP ${data.ip} Is already`);
        console.log('=======================================');
      }
    });
  }

  ngOnInit(): void {
    this.getGeoLocaleIps();
  }

  filterData() {
    this.initDate.value.setHours(0, 0, 0, 0);
    this.endDate.value.setHours(24, 0, 0, 0);
    this.getDataIps(this.initDate.value, this.endDate.value);
  }

  getDataIps(initDate = undefined, endDate = undefined) {
    this.CallToActionsService.getAllData(initDate, endDate).subscribe(
      ipsSnapshot => {
        this.dataSource = [];

        ipsSnapshot.forEach((ipData: any) => {
          const location = this.ipsDataGeoLocale.find(dataLocation => {
            return dataLocation.ip === ipData.payload.doc.data().ip;
          });

          this.dataSource.push({
            ip: ipData.payload.doc.data().ip,
            date: ipData.payload.doc.data().date,
            fromF5: ipData.payload.doc.data().fromF5,
            total: 0,
            eventName: ipData.payload.doc.data().eventName,
            latitude: location === undefined ? '' : location.latitude,
            longitude: location === undefined ? '' : location.longitude,
            routePath:
              ipData.payload.doc.data().routePath === undefined
                ? '/'
                : ipData.payload.doc.data().routePath.toString()
          });
        });

        this.ipsData = new MatTableDataSource<IpData>(this.transformDataIps());
        this.ipsData.sort = this.sort;
      }
    );
  }

  getGeoLocaleIps() {
    this.ipGeoLocaleService.getIpsTrack().subscribe(ipsSnapshot => {
      this.dataSource = [];

      ipsSnapshot.forEach((ipData: any) => {
        this.ipsDataGeoLocale.push(ipData.payload.doc.data());
      });
      this.getDataIps(this.initDate.value, this.endDate.value);
    });
  }

  transformFromReload(fromReload: string): string {
    return fromReload ? '(Recargó)' : '';
  }

  transformDataIps() {
    let result = this.dataSource.reduce((prev, current, index, arr) => {
      let exists = prev.find(x => x.ip === current.ip);
      if (!exists) {
        const dataSourceByIp = this.dataSource.filter(data => {
          return data.ip === current.ip;
        });

        const dates = dataSourceByIp.map(data => {
          return `<span><b>Action:</b> ${data.eventName}</span><span>${
            data.date
          } ${this.transformFromReload(data.fromF5)} </span><span>Página: ${
            data.routePath
          }</span>`;
        });

        let paths = dataSourceByIp.map(data => {
          return `${data.routePath}`;
        });

        paths = paths.reduce((acc, current) => {
          if (
            !acc.find(data => {
              return data === current;
            })
          ) {
            acc.push(current);
          }
          return acc;
        }, []);

        exists = {
          ip: current.ip,
          date: dates,
          fromF5: current.fromF5,
          total: this.getTotalIp(current.ip),
          latitude: current.latitude,
          longitude: current.longitude,
          routePath: paths
        };
        prev.push(exists);
      }

      return prev;
    }, []);

    return result.sort(function(a, b) {
      if (a.total < b.total) {
        return 1;
      }
      if (a.total > b.total) {
        return -1;
      }
      return 0;
    });
  }

  updateIpsDates() {
    let cont = 0;
    this.CallToActionsService.getAllData().subscribe(ipsSnapshot => {
      console.log('===== TOTAL ====== ', ipsSnapshot.length);
      ipsSnapshot.forEach((ipData: any) => {
        let data = ipData.payload.doc.data();
        // if (data.dateJson === undefined) {
        cont++;
        // }
        if (cont < 400) {
          console.log(ipData.payload.doc.data());
          console.log(ipData.payload.doc.id);

          if (data.date.toString().indexOf('p. m.') !== -1) {
            data.date = data.date.replace('p. m.', 'PM');
          }
          if (data.date.toString().indexOf('a. m.') !== -1) {
            data.date = data.date.replace('a. m.', 'AM');
          }
          data.date = data.date.replace('7/10/2020', '10/7/2020');
          data.date = data.date.replace('6/10/2020', '10/6/2020');

          let date = new Date(data.date);
          let jsonDate = date.toJSON();
          console.log(data.date);
          console.log(jsonDate);
          console.log(this.jsonDateToDate(jsonDate));

          data = { ...data, dateJson: jsonDate, timestamp: date };
          console.log('data: ==== ', data);
          console.log('===== COUNYTER ====== ', cont);
          this.CallToActionsService.updateData(ipData.payload.doc.id, data)
            .then(response => {
              console.log(response);
              console.log(`update success by id ${ipData.payload.doc.id} `);
            })
            .catch(error => {
              console.log(error);
              console.log(`update error by id ${ipData.payload.doc.id} `);
            });
        }
      });
    });
  }

  jsonDateToDate(jsonDate: any): string {
    let date = new Date(jsonDate);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  getTotalIp(ip: string): number {
    const data = this.dataSource.filter(obj => {
      return obj.ip === ip;
    });
    return data === undefined ? 0 : data.length;
  }
}
