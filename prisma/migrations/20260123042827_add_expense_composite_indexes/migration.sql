-- CreateIndex
CREATE INDEX "Expense_userId_type_date_idx" ON "Expense"("userId", "type", "date");

-- CreateIndex
CREATE INDEX "Expense_userId_amount_idx" ON "Expense"("userId", "amount");
