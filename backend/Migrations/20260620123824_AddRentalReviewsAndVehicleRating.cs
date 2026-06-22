using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BdCabs.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRentalReviewsAndVehicleRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Rating",
                table: "Vehicles",
                type: "double precision",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RideId",
                table: "Reviews",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "RentalAgreementId",
                table: "Reviews",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_RentalAgreementId_ReviewerId_RevieweeType",
                table: "Reviews",
                columns: new[] { "RentalAgreementId", "ReviewerId", "RevieweeType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_RentalAgreementId_ReviewerId_RevieweeType",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "RentalAgreementId",
                table: "Reviews");

            migrationBuilder.AlterColumn<Guid>(
                name: "RideId",
                table: "Reviews",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
