import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpException, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { PaymentService, MonthTotals, TenantLedgerEntry } from './payment.service';
import { Prisma } from '@prisma/client';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { HashidService } from 'src/common/hashid/hashid.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly hashidService: HashidService,
  ) {}

  //frontend
  @Get('summary')
  async getManagerSummary() {
    return this.paymentService.getManagerLevelSummary();
  }

  @Get(':houseId/summary')
  async getHouseSummary(@Param('houseId', HashidPipe) houseId: number) {
    console.log(houseId);
    return this.paymentService.getHouseLevelSummary(houseId);
  }

  @Get('le/:leaseCode/summary')
  async getTenantSummary(@Param('leaseCode') leaseCode: string) {
    return this.paymentService.getTenantLevelSummary(leaseCode);
  }

  @Post('createPayment')
  async createPayment(@Body() createPaymentDto: any) {
    console.log(createPaymentDto);
    try {
      if (!createPaymentDto.lease || !createPaymentDto.lease.connect?.code) {
        throw new HttpException(
          'Lease code is required.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!createPaymentDto.date) {
        throw new HttpException('Date is required.', HttpStatus.BAD_REQUEST);
      }

      const parsedDate = new Date(createPaymentDto.date);
      if (isNaN(parsedDate.getTime())) {
        throw new HttpException('Invalid date format.', HttpStatus.BAD_REQUEST);
      }

      createPaymentDto.date = parsedDate;

      const payment = await this.paymentService.createPayment(createPaymentDto);

      return {
        message: 'Payment created successfully.',
      };
    } catch (error) {
      console.error('Failed to create payment:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //backend
  @Post()
  create(
    @Body()
    createPaymentDto: Prisma.paymentCreateInput,
  ) {
    return this.paymentService.create(createPaymentDto);
  }

  // @Post('webhook')
  // receiveMpesaPayment(@Body() payload: any) {
  //   return this.paymentService.processMpesaPayment(payload);
  // }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('getAll')
  getAll() {
    return this.paymentService.getAll();
  }

  @Get('recent')
  recent() {
    return this.paymentService.recent();
  }

  @Get('unit/:unitId')
  getAllUnit(@Param('unitId', HashidPipe) unitId: string) {
    return this.paymentService.getAllUnit(+unitId);
  }

  @Get('byHouseId/:houseId')
  findAll2(@Param('houseId', HashidPipe) houseId: string) {
    return this.paymentService.findAll2(+houseId);
  }

  @Get('get/tenant/:leaseCode')
  findAll3(@Param('leaseCode') leaseCode: string) {
    return this.paymentService.findAll3(leaseCode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(+id);
  }
  @Patch('editPayment/:id')
  async update(
    @Param('id', HashidPipe) id: string,
    @Body() updatePaymentDto: Prisma.paymentUpdateInput,
  ) {
    try {
      const updated = await this.paymentService.update(+id, updatePaymentDto);

      if (!updated) {
        throw new HttpException(
          { message: 'Payment not found or cannot be edited.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        message: 'Payment updated successfully.',
      };
    } catch (error) {
      console.error('Error updating payment:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { message: 'Failed to update payment.', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('deleteTransaction/:id')
  remove(@Param('id', HashidPipe) id: string) {
    return this.paymentService.remove(+id);
  }

  @Get('housesSummary/:year')
  async getHouseSummaries(@Param('year') year: string) {
    return this.paymentService.getHouseSummaries(Number(year));
  }

  @Get('house/:houseId/:year')
  async getUnitsUsedPerMonth(
    @Param('houseId', HashidPipe) houseId: string,
    @Param('year') year: string,
  ) {
    return this.paymentService.payments(Number(houseId), Number(year));
  }

  @Get('lease/:unitId/:year')
  async getLeaseSummary(
    @Param('unitId', HashidPipe) unitId: string,
    @Param('year') year: string,
  ) {
    return this.paymentService.getLeaseSummary(Number(unitId), Number(year));
  }

  @Get('years/:houseId')
  async getPaidYears(@Param('houseId', HashidPipe) houseId: string) {
    return this.paymentService.getPaidYears(Number(houseId));
  }

  @Get('years/unit/:unitId')
  async getPaidUnitYears(@Param('unitId', HashidPipe) unitId: string) {
    return this.paymentService.getPaidUnitYears(Number(unitId));
  }

  @Get('all/years')
  async getYears() {
    return this.paymentService.getYears();
  }

  @Delete('deletePayments')
  async deleteMany(@Body('ids') ids: string[]) {
    console.log(ids);
    try {
      const idArray = ids.map((id) => this.hashidService.decode(id));

      if (idArray.length === 0) {
        throw new HttpException(
          { message: 'No payment IDs provided.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.paymentService.deleteMany(idArray);

      if (result.count === 0) {
        throw new HttpException(
          {
            message: 'No payments were deleted. Please check the provided IDs.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        message: `${result.count} payment(s) deleted successfully.`,
      };
    } catch (error) {
      console.error('Delete many payments error:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { message: 'Failed to delete payments.', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('houseDisplay/:houseId/:year')
  async houseDisplay(
    @Param('houseId', HashidPipe) houseId: string,
    @Param('year') year: string,
  ): Promise<MonthTotals[]> {
    return this.paymentService.houseDisplay(Number(houseId), Number(year));
  }

  @Get('dashboard/:year')
  async dashboardDisplay(@Param('year') year: string): Promise<MonthTotals[]> {
    return this.paymentService.dashboardDisplay(Number(year));
  }

  @Get('tenant-ledger/:leaseCode/:year')
  async tenantLedger(
    @Param('leaseCode') leaseCode: string,
    @Param('year') year: string,
  ): Promise<TenantLedgerEntry[]> {
    return this.paymentService.ledgerForTenant(leaseCode, Number(year));
  }

  //reports
  @Get('report/yearly/:houseId')
  yearlyReport(
    @Param('houseId', HashidPipe) houseId: number,
    @Query('year') year: string,
    @Query('startMonth') startMonth: string,
    @Query('endMonth') endMonth: string,
    @Query('includePastTenantsData') includePastTenantsData?: string,
  ) {
    return this.paymentService.yearlyReport(
      houseId,
      year,
      startMonth,
      endMonth,
      includePastTenantsData === 'true',
    );
  }

  @Get('report/monthly/:houseId')
  monthlyReport(
    @Param('houseId', HashidPipe) houseId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('includePastTenantsData') includePastTenantsData?: string,
  ) {
    const includePast = includePastTenantsData === 'true';
    return this.paymentService.monthlyReport(houseId, month, year, includePast);
  }
}
