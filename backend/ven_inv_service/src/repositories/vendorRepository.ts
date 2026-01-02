import { DataSource, Repository } from "typeorm";
import { Vendor } from "../entities/vendorEntity";

export class VendorRepository extends Repository<Vendor> {
  constructor(dataSource: DataSource) {
    super(Vendor, dataSource.manager);
  }

  findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }

  findByName(name: string) {
    return this.findOne({ where: { name } });
  }
}
