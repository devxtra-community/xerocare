'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashbordTable() {
  const data = [
    {
      printerName: 'HP LaserJet Pro',
      serialNumber: 'HP-LJ-982345',
      model: 'M404dn',
      manufactureDate: '2023-02-15',
      company: 'HP',
      vendor: 'TechSource India',
      stock: 12,
    },
    {
      printerName: 'Canon ImageCLASS',
      serialNumber: 'CN-IMG-774521',
      model: 'MF244dw',
      manufactureDate: '2022-11-08',
      company: 'Canon',
      vendor: 'OfficeMart',
      stock: 8,
    },
    {
      printerName: 'Epson EcoTank',
      serialNumber: 'EP-ET-556812',
      model: 'L3150',
      manufactureDate: '2023-06-20',
      company: 'Epson',
      vendor: 'PrintHub Vendors',
      stock: 15,
    },
    {
      printerName: 'Brother HL Series',
      serialNumber: 'BR-HL-334455',
      model: 'HL-L2351DW',
      manufactureDate: '2022-09-30',
      company: 'Brother',
      vendor: 'SupplyZone',
      stock: 6,
    },
    {
      printerName: 'Xerox Phaser',
      serialNumber: 'XR-PH-998877',
      model: 'Phaser 3260',
      manufactureDate: '2021-12-12',
      company: 'Xerox',
      vendor: 'Global IT Supplies',
      stock: 4,
    },
    {
      printerName: 'HP DeskJet',
      serialNumber: 'HP-DJ-112233',
      model: '2776',
      manufactureDate: '2023-04-05',
      company: 'HP',
      vendor: 'SmartTech Vendors',
      stock: 10,
    },
    {
      printerName: 'Canon PIXMA',
      serialNumber: 'CN-PX-445566',
      model: 'G3020',
      manufactureDate: '2022-07-18',
      company: 'Canon',
      vendor: 'QuickOffice',
      stock: 9,
    },
    {
      printerName: 'Epson WorkForce',
      serialNumber: 'EP-WF-778899',
      model: 'WF-2830',
      manufactureDate: '2023-01-25',
      company: 'Epson',
      vendor: 'PrintLine',
      stock: 7,
    },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-primary font-bold">Printer Name</TableHead>
            <TableHead className="text-primary font-bold">Serial Number</TableHead>
            <TableHead className="text-primary font-bold">Model</TableHead>
            <TableHead className="text-primary font-bold">Manufacture Date</TableHead>
            <TableHead className="text-primary font-bold">Company Name</TableHead>
            <TableHead className="text-primary font-bold">Vendor Name</TableHead>
            <TableHead className="text-primary font-bold">Stock</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className={index % 2 ? 'bg-blue-50/20' : 'bg-white'}>
              <TableCell className="font-medium text-primary ">{item.printerName}</TableCell>
              <TableCell>{item.serialNumber}</TableCell>
              <TableCell>{item.model}</TableCell>
              <TableCell>{item.manufactureDate}</TableCell>
              <TableCell>{item.company}</TableCell>
              <TableCell>{item.vendor}</TableCell>
              <TableCell className="font-bold text-primary">{item.stock}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
