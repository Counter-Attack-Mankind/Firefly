#include <iostream>
#include <string>
#include <windows.h>
using namespace std;

void swap1(int a, int b)
{
    int temp = a;
    a = b;
    b = temp;
}

void swap2(int& a, int& b)
{
    int temp = a;
    a = b;
    b = temp;
}

void print(const string& str)
{
    cout << "string content: " << str << endl;
}

void compare(int a, int b, int& maxValue, int& minValue)
{
    if (a > b)
    {
        maxValue = a;
        minValue = b;
    }
    else
    {
        maxValue = b;
        minValue = a;
    }
}

int& Max(int& a, int& b)
{
    if (a > b)
        return a;
    else
        return b;
}

int main()
{

    int x = 10;
    int y = 20;

    swap1(x, y);
    cout << "swap1(x, y):" << endl;
    cout << "x = " << x << endl;
    cout << "y = " << y << endl << endl;

    swap2(x, y);
    cout << "swap2(x, y):" << endl;
    cout << "x = " << x << endl;
    cout << "y = " << y << endl << endl;

    string name = "Lou";
    print(name);
    cout << endl;

    int maxNum;
    int minNum;
    compare(35, 12, maxNum, minNum);

    cout << "compare(35, 12, maxNum, minNum):" << endl;
    cout << "max: " << maxNum << endl;
    cout << "min: " << minNum << endl << endl;

    int a = 5;
    int b = 8;

    Max(a, b) = 100;

    cout << "Max(a, b) = 100:" << endl;
    cout << "a = " << a << endl;
    cout << "b = " << b << endl;

    return 0;
}
